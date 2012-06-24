$(document).ready(function() {
    var loaddata = function(e) {
        $('#table-contents').load('http://localhost/prezentacja_closure/public/index/paginationhtml');
        if(e) {
            e.preventDefault();
        }
        return false;
    };
    $('#next-page').click(loaddata);
    loaddata();
});
