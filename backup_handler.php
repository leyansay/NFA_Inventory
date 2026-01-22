<?php
// backup_handler.php
header('Content-Type: application/json');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_NAME', 'nfa_inventory');

// Backup directory (make sure this directory exists and is writable)
define('BACKUP_DIR', __DIR__ . '/backups/');

// Create backup directory if it doesn't exist
if (!file_exists(BACKUP_DIR)) {
    mkdir(BACKUP_DIR, 0755, true);
}

// Database connection
function getConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        return $conn;
    } catch (Exception $e) {
        die(json_encode(['success' => false, 'message' => $e->getMessage()]));
    }
}

// Create database backup
function createBackup($tables) {
    $conn = getConnection();
    
    $timestamp = date('Ymd_His');
    $filename = "nfa_backup_{$timestamp}.sql";
    $filepath = BACKUP_DIR . $filename;
    
    $sqlDump = "-- NFA Inventory Database Backup\n";
    $sqlDump .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $sqlDump .= "-- Database: " . DB_NAME . "\n\n";
    $sqlDump .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
    $sqlDump .= "SET time_zone = \"+00:00\";\n\n";
    
    foreach ($tables as $table) {
        // Get table structure
        $result = $conn->query("SHOW CREATE TABLE `{$table}`");
        if ($result) {
            $row = $result->fetch_row();
            $sqlDump .= "\n\n-- --------------------------------------------------------\n";
            $sqlDump .= "-- Table structure for table `{$table}`\n";
            $sqlDump .= "-- --------------------------------------------------------\n\n";
            $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $sqlDump .= $row[1] . ";\n\n";
            
            // Get table data
            $result = $conn->query("SELECT * FROM `{$table}`");
            if ($result && $result->num_rows > 0) {
                $sqlDump .= "-- Dumping data for table `{$table}`\n\n";
                
                while ($row = $result->fetch_assoc()) {
                    $columns = array_keys($row);
                    $values = array_values($row);
                    
                    // Escape values
                    $values = array_map(function($value) use ($conn) {
                        if ($value === null) {
                            return 'NULL';
                        }
                        return "'" . $conn->real_escape_string($value) . "'";
                    }, $values);
                    
                    $sqlDump .= "INSERT INTO `{$table}` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $values) . ");\n";
                }
                $sqlDump .= "\n";
            }
        }
    }
    
    // Write to file
    if (file_put_contents($filepath, $sqlDump)) {
        // Log backup to database
        logBackup($filename, filesize($filepath), 'success');
        
        $conn->close();
        
        // Return file for download
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        exit;
    } else {
        $conn->close();
        echo json_encode(['success' => false, 'message' => 'Failed to create backup file']);
    }
}

// Restore database from backup
function restoreBackup($backupFile) {
    if (!isset($backupFile['tmp_name']) || !file_exists($backupFile['tmp_name'])) {
        return ['success' => false, 'message' => 'Backup file not found'];
    }
    
    $conn = getConnection();
    $sqlContent = file_get_contents($backupFile['tmp_name']);
    
    // Split SQL statements
    $statements = array_filter(array_map('trim', explode(';', $sqlContent)));
    
    $conn->autocommit(FALSE);
    $success = true;
    $errorMsg = '';
    
    try {
        foreach ($statements as $statement) {
            if (!empty($statement) && !preg_match('/^--/', $statement)) {
                if (!$conn->query($statement)) {
                    throw new Exception("Error executing query: " . $conn->error);
                }
            }
        }
        $conn->commit();
        $message = 'Database restored successfully';
    } catch (Exception $e) {
        $conn->rollback();
        $success = false;
        $message = $e->getMessage();
    }
    
    $conn->autocommit(TRUE);
    $conn->close();
    
    return ['success' => $success, 'message' => $message];
}

// Quick restore from existing backup file
function quickRestore($filename) {
    $filepath = BACKUP_DIR . $filename;
    
    if (!file_exists($filepath)) {
        return ['success' => false, 'message' => 'Backup file not found'];
    }
    
    $conn = getConnection();
    $sqlContent = file_get_contents($filepath);
    
    $statements = array_filter(array_map('trim', explode(';', $sqlContent)));
    
    $conn->autocommit(FALSE);
    $success = true;
    
    try {
        foreach ($statements as $statement) {
            if (!empty($statement) && !preg_match('/^--/', $statement)) {
                if (!$conn->query($statement)) {
                    throw new Exception("Error executing query: " . $conn->error);
                }
            }
        }
        $conn->commit();
        $message = 'Database restored successfully from ' . $filename;
    } catch (Exception $e) {
        $conn->rollback();
        $success = false;
        $message = $e->getMessage();
    }
    
    $conn->autocommit(TRUE);
    $conn->close();
    
    return ['success' => $success, 'message' => $message];
}

// Delete backup file
function deleteBackup($filename) {
    // Security: prevent directory traversal
    $filename = basename($filename);
    $filepath = BACKUP_DIR . $filename;
    
    if (file_exists($filepath)) {
        if (unlink($filepath)) {
            // Remove from log
            $conn = getConnection();
            $stmt = $conn->prepare("DELETE FROM backup_log WHERE filename = ?");
            $stmt->bind_param("s", $filename);
            $stmt->execute();
            $stmt->close();
            $conn->close();
            
            return ['success' => true, 'message' => 'Backup deleted successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to delete backup file'];
        }
    } else {
        return ['success' => false, 'message' => 'Backup file not found'];
    }
}

// Get backup history
function getBackupHistory() {
    $backups = [];
    
    if ($handle = opendir(BACKUP_DIR)) {
        while (false !== ($file = readdir($handle))) {
            if ($file != "." && $file != ".." && pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
                $filepath = BACKUP_DIR . $file;
                $size = filesize($filepath);
                $datetime = date('Y-m-d H:i:s', filemtime($filepath));
                
                $backups[] = [
                    'filename' => $file,
                    'datetime' => $datetime,
                    'size' => formatBytes($size),
                    'status' => 'success'
                ];
            }
        }
        closedir($handle);
    }
    
    // Sort by datetime descending
    usort($backups, function($a, $b) {
        return strtotime($b['datetime']) - strtotime($a['datetime']);
    });
    
    return ['backups' => $backups];
}

// Log backup to database
function logBackup($filename, $size, $status) {
    $conn = getConnection();
    
    // Create backup_log table if it doesn't exist
    $sql = "CREATE TABLE IF NOT EXISTS backup_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        size BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $conn->query($sql);
    
    // Insert log entry
    $stmt = $conn->prepare("INSERT INTO backup_log (filename, size, status) VALUES (?, ?, ?)");
    $stmt->bind_param("sis", $filename, $size, $status);
    $stmt->execute();
    $stmt->close();
    $conn->close();
}

// Format bytes to human readable
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

// Handle requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'create_backup':
            $tables = json_decode($_POST['tables'] ?? '[]', true);
            if (!empty($tables)) {
                createBackup($tables);
            } else {
                echo json_encode(['success' => false, 'message' => 'No tables selected']);
            }
            break;
            
        case 'restore_backup':
            if (isset($_FILES['backup_file'])) {
                $result = restoreBackup($_FILES['backup_file']);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'No backup file uploaded']);
            }
            break;
            
        case 'quick_restore':
            $filename = $_POST['filename'] ?? '';
            if (!empty($filename)) {
                $result = quickRestore($filename);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'No filename provided']);
            }
            break;
            
        case 'delete_backup':
            $filename = $_POST['filename'] ?? '';
            if (!empty($filename)) {
                $result = deleteBackup($filename);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'No filename provided']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_history') {
        echo json_encode(getBackupHistory());
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
}
?>