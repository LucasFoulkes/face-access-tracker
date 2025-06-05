// This script helps reset the database to trigger a fresh population
// 1. Open your browser's developer tools (F12)
// 2. Go to Application tab
// 3. Select "IndexedDB" in the left sidebar
// 4. Find "TimeAttendanceDatabase" and delete it
// 5. Refresh the page

// Alternatively, run this code in your browser's console:

function resetDatabase() {
    if (confirm('This will delete all data in the database. Are you sure?')) {
        // Delete the database
        const deleteRequest = indexedDB.deleteDatabase('TimeAttendanceDatabase');

        deleteRequest.onerror = function (event) {
            console.error("Error deleting database:", event);
            alert('Error deleting database: ' + event);
        };

        deleteRequest.onsuccess = function (event) {
            console.log("Database deleted successfully");
            alert('Database deleted successfully. The page will now reload.');
            // Reload the page to recreate the database
            window.location.reload();
        };
    }
}

// To trigger database recreation, simply call:
// resetDatabase()

// You can also manually add test data for the menus table if needed
function addTestMenus() {
    // Get the database instance - this assumes you're using Dexie
    const dbPromise = window.db || window.dexie;

    if (!dbPromise) {
        alert('Database instance not found. Please try again after page load.');
        return;
    }

    dbPromise.menus.bulkAdd([
        { name: 'Desayuno', timeRange: '06:00 - 09:00', price: 2500 },
        { name: 'Desayuno Empresarial', timeRange: '06:00 - 09:00', price: 3500 },
        { name: 'Almuerzo', timeRange: '11:30 - 14:30', price: 4500 },
        { name: 'Almuerzo Empresarial', timeRange: '11:30 - 14:30', price: 6000 },
        { name: 'Cena', timeRange: '18:00 - 21:00', price: 3800 },
        { name: 'Cena Empresarial', timeRange: '18:00 - 21:00', price: 5200 }
    ]).then(() => {
        alert('Test menus added successfully!');
        window.location.reload();
    }).catch(error => {
        alert('Error adding test menus: ' + error);
    });
}
