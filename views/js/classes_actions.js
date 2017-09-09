$(document).ready(function(){
	console.log("Before $.ajax");
    $("#read_classes").click(function(e) {
		e.preventDefault();
		$.ajax({
			url: "/read_classes",
			type: "GET",
			dataType: "json",
			data:{allclasses: ""},
			contentType: "application/json",
			cache: true,
			timeout: 5000,
			complete: function() {
			  console.log('process complete');
			},
			success: function(data) {
				console.log('process success');
				document.getElementById("show_all_classes").style.display="block";
				var classes_table = "<table style=\"color: #FFFFFA;\">";
				classes_table += "<tr>";
				classes_table += "<th>Weekday</th>";
				classes_table += "<th>Title</th>";
				classes_table += "</tr>";
				for(var i = 0; i < data.length; i++) {
					classes_table += "<tr>";
					classes_table += "<td>" + data[i].day + "</td>";
					classes_table += "<td>" + data[i].title + "</td>";
					classes_table += "</tr>";
				}
				classes_table += "</table>";
				document.getElementById("show_all_classes").innerHTML = classes_table;
            },
            error: function() {
                console.log('process error');
            },
        });
    });
});
