$(document).ready(function() {
    var loaddata = function(e) {
        $('#table-contents').load('/index/paginationhtml');
        if(e) {
            e.preventDefault();
        }
        return false;
    };
    $('#next-page').click(loaddata);
    loaddata();
});
