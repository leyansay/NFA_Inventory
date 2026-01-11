// back-prevention.js - Prevent back button after logout
// Add this script to ALL your pages (index.html, home.html, accountable.html, etc.)

(function() {
    'use strict';
    
    const currentPage = window.location.pathname.split('/').pop();
    
    // List of protected pages
    const protectedPages = [
        'home.html',
        'accountable.html', 
        'transaction.html',
        'inventory.html',
        'report.html',
        'activity_library.html',
        'cereal_library.html',
        'location_library.html',
        'sack_library.html',
        'warehouse_library.html',
        'variety_library.html'
    ];
    
    // Check if current page is protected
    const isProtectedPage = protectedPages.includes(currentPage);
    
    // For protected pages - check if logged in
    if (isProtectedPage) {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        const currentUser = sessionStorage.getItem('currentUser');
        
        // If not logged in, redirect to index
        if (isLoggedIn !== 'true' || !currentUser) {
            window.location.replace('index.html');
            return;
        }
        
        // Prevent back button going to index.html when logged in
        window.history.pushState(null, '', window.location.href);
        
        window.addEventListener('popstate', function(event) {
            const stillLoggedIn = sessionStorage.getItem('isLoggedIn');
            
            if (stillLoggedIn !== 'true') {
                // If logged out, block back and redirect to index
                window.history.pushState(null, '', window.location.href);
                window.location.replace('index.html');
            } else {
                window.history.pushState(null, '', window.location.href);
                window.location.replace('home.html');
                
            }
        });
    }
    
    // // For index.html (login page) - redirect if already logged in
    // if (currentPage === 'index.html' || currentPage === '') {
    //     const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    //     const currentUser = sessionStorage.getItem('currentUser');
        
    //     // If already logged in, redirect to home immediately
    //     if (isLoggedIn === 'true' && currentUser) {
    //         window.location.replace('home.html');
    //         return;
    //     }
        
    //     // Prevent going back to protected pages when on index
    //     window.history.pushState(null, '', window.location.href);
        
    //     window.addEventListener('popstate', function(event) {
    //         window.history.pushState(null, '', window.location.href);
    //     });
    // }
    
})();