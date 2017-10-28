$(document).ready(function() {

	$.ajax({
		url: "/fill_schedule_table",
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
			document.getElementById("create_class_form").style.display="none";

			for(var i = 0; i < data.length; i++) {
				var start = moment(data[i].start, "DD/MM/YYYY hh:mm A");
				var duration = data[i].duration;
				var sp = duration.split(":");
				var hours = parseInt(sp[0]);
				var mins = parseInt(sp[1]);

				var d = start.toDate().getDay() + 1;
				var m = start.toDate().getMonth() + 1;
				var y = start.toDate().getYear() + 1900;

				var colIndex = (start.minutes() == 0 ? 1 : 0) + d - 1;
				var rowIndex = ((start.hours() - 9) * 2 + (start.minutes() == 0 ? 0 : 1)) + 2;

				var cells = hours * 2 + (mins == 0 ? 0 : 1);

				var textColors =       ["#1A4F0A", "#4E4809", "#4F370B", "#0F264F", "#4F0C4A"];
				var backgroundColors = ["#AAFF98", "#FEF39A", "#FFCC71", "#A6C2FF", "#FFC1F9"];
				var buttonColors =     ["#A1F48F", "#F3E891", "#F4C36A", "#9DB8F4", "#F4B5EE"];

				/// Assign colors, depending on row numbers
				var colorIndex = 0;
				for(var s = 5; s >= 1; s--) {
					if(((rowIndex - 2) % s) == 0) {
						colorIndex = s - 1;
						break;
					}
				}

				(document.getElementById("taskView").rows[rowIndex].cells[colIndex]).innerHTML = 
				'<div id="over" style="z-index: 1;height: ' + (cells * 100) + 'px;color: ' + textColors[colorIndex] + ';background: ' + backgroundColors[colorIndex] +'; margin-left: auto; margin-right: auto; display: block;">' + 
				"<button type=\"button\" onclick=\"" + 
					"document.getElementById('update_class_form').style.display='block';" + 
					"document.getElementById('create_class_form').style.display='none';" + 
					"getElementById('upd_start').value = '" + moment(start).format('DD/MM/YYYY hh:mm A') + "';" + 
					// "document.getElementById('upd_start').value = '" + data[i].start + "';" + 
					"document.getElementById('upd_duration').value = '" + data[i].duration + "';" + 
					"document.getElementById('upd_class_title').value = '" + data[i].title + "';" + 
					"document.getElementById('upd_class_description').value = '" + data[i].description + "';" + 
				"\"" + 
				"class=\"btn\" style=\"background-color:" + backgroundColors[colorIndex] + ";margin-left: 0;margin-right: auto;float: left;\">" + 
				"<span class='glyphicon glyphicon-edit' aria-hidden='true'></span>" + 
				"</button>" + 
				"<button type=\"button\" onclick=" + 
				"\"" + 
				"$.ajax({" + 
					"url: '/remove_class'," + 
					"type: 'GET'," + 
					"dataType: 'json'," + 
					"data: {" + 
						"start: '" + data[i].start + "'," + 
						"duration: '" + data[i].duration + "'," + 
						"title: '" + data[i].title + "'" + 
					"}," + 
					"contentType: 'application/json'," + 
					"cache: true," + 
					"timeout: 5000," + 
					"complete: function() {" + 
						"console.log('process complete');" + 
					"}," + 
					"success: function(data) {" + 
						"console.log('process success');" + 
						"document.getElementById('removed_class').style.display='block';" + 
						/// Refresh page (add table update, using AJAX later)
						"location.reload(true);" + 
					"}," + 
					"error: function() {" + 
						"console.log('process error');" + 
					"}," + 
				"});\"" + 
				"class=\"btn\" style=\"background-color:" + backgroundColors[colorIndex] + ";margin-left: auto;margin-right: 0;float: right;\">" + 
				"<span class='glyphicon glyphicon-remove' aria-hidden='true'></span>" + 
				"</button>" + 
				'<img src="img/pin.png" width="42" height="42">' + 
				"<h4>" + 
				"<p><strong># " + data[i].title + "</strong></p>" + 
				"</h4>" + 
				"<p style='font-family:\"Comic Sans MS\"'>" + data[i].description + "</p>" + 
				"</div>";

				// // Calculate the new height
				// var height = cells * 100;
				// var cell = (document.getElementById("taskView").rows[rowIndex].cells[colIndex]);
				// // Create a new div to go inside the cell
				// var newDiv = document.createElement("div");
				// newDiv.style.color = textColors[colorIndex];
				// newDiv.style.background = backgroundColors[colorIndex];
				// newDiv.style.marginLeft = "auto";
				// newDiv.style.marginRight = "right";
				// newDiv.style.display = "block";
				// newDiv.style.height = height + "px";
				// newDiv.innerHTML = 
				// 	'<button type="button" class="btn" style="float: right; background-color:' + buttonColors[colorIndex] + ';">' + 
				// 	"<span class='glyphicon glyphicon-remove' aria-hidden='true'></span>" + 
				// 	"</button>" + 
				// 	'<img src="img/pin.png" width="42" height="42">' + 
				// 	"<h4>" + 
				// 	"<p><strong># " + data[i].title + "</strong></p>" + 
				// 	"</h4>" + 
				// 	"<p style='font-family:\"Comic Sans MS\"'>" + data[i].description + "</p>";
				// // Add it to view
				// cell.appendChild(newDiv);
			}

			for(var rowIndex = 2; rowIndex < 20; rowIndex++) {
				var from = ((rowIndex % 2) == 0) ? 1 : 0;
				var to = ((rowIndex % 2) == 0) ? 8 : 7;
				for(var colIndex = from; colIndex < to; colIndex++) {

					var hours = Math.floor(((rowIndex - 2) / 2) + 9);
					var mins = ((rowIndex - 2) % 2 == 0) ? 0 : 30;
					var dateParts = (document.getElementById("taskView").rows[0].cells[colIndex + ((rowIndex % 2 == 0) ? 0 : 1)]).innerHTML.split("/");
					var start = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], hours, mins);

					if((document.getElementById("taskView").rows[rowIndex].cells[colIndex]).innerHTML == "&nbsp;") {
						(document.getElementById("taskView").rows[rowIndex].cells[colIndex]).innerHTML = 
						"<div>" + 
						"<button type=\"button\" onclick=\"" + 
						"document.getElementById('create_class_form').style.display='block';" + 
						"document.getElementById('update_class_form').style.display='none';" + 
						"document.getElementById('create_start').value = '" + moment(start).format('DD/MM/YYYY hh:mm A') + "';" + 
						"\"" + 
						"class=\"btn\" style=\"background-color: #EDEDEE;width: 100%;height: 99px;\">" + 
						"<span aria-hidden='true'></span>" + 
						"</button>" + 
						"</div>";
					}
				}
			}
		},
		error: function() {
		    console.log('process error');
		},
	});

	$("#button_login_student").click(function(e) {
		e.preventDefault();
		var classes_array = new Array();
		var t = document.getElementById("enrollView");
		var checkboxes = t.getElementsByTagName("input");
		for(var i = 0; i < checkboxes.length; i++) {
			if(checkboxes[i].checked) {
				classes_array.push(checkboxes[i].name);
			}
		}
		$.ajax({
			url: "/login_student",
			type: "GET",
			dataType: "json",
			data: {
				classes: classes_array
			},
			contentType: "application/json",
			cache: true,
			timeout: 5000,
			complete: function() {
			  console.log('process complete');
			},
			success: function(data) {
				console.log('process success');
				location.reload(true);
			},
			error: function() {
				console.log('process error');
			},
		});
	});

	$("#button_login_lecturer").click(function(e) {
		e.preventDefault();
		$.ajax({
			url: "/login_lecturer",
			type: "GET",
			dataType: "json",
			data: {
			},
			contentType: "application/json",
			cache: true,
			timeout: 5000,
			complete: function() {
			  console.log('process complete');
			},
			success: function(data) {
				console.log('process success');
				if(data.success === "true") {
				  console.log('real success');
				}
				$("#myModal").modal("hide");
			},
			error: function() {
				console.log('process error');
			},
		});
	});

	$("#create_class_button").click(function(e) {
		e.preventDefault();
		$.ajax({
			url: "/create_class",
			type: "GET",
			dataType: "json",
			data: {
				start: $("#create_start").val(),
				duration: $("#create_duration").val(),
				title: $("#create_class_title").val(),
				description: $("#create_class_description").val()
			},
			contentType: "application/json",
			cache: true,
			timeout: 5000,
			complete: function() {
			  console.log('process complete');
			},
			success: function(data) {
				console.log('process success');
				if(data.added === "Yes") {
					document.getElementById("create_class_form").style.display="none";
	 				document.getElementById("created_class").style.display="block";
				}
				/// Refresh page (add table update, using AJAX later)
				location.reload(true);
			},
			error: function() {
				console.log('process error');
			},
		});
	});

	 $("#update_class_button").click(function(e){
	 	e.preventDefault();
	 	$.ajax({
	 		url: "/update_class",
	 		type: "GET",
	 		dataType: "json",
	 		data: {
				 upd_start: $("#upd_start").val(), 
				 upd_duration: $("#upd_duration").val(), 
				 upd_class_title: $("#upd_class_title").val(), 
				 upd_class_description: $("#upd_class_description").val()},
	 		contentType: "application/json",
	 		cache: true,
	 		timeout: 5000,
	 		complete: function() {
	 			console.log('process complete');
	 		},
	 		success: function(data) {
				console.log('process success');
	 			if(data.updated === "updated") {
					document.getElementById("update_class_form").style.display="none";
	 				document.getElementById("updated_class").style.display="block";
				 }
				 /// Refresh page (add table update, using AJAX later)
				 location.reload(true);
	 		}
	 	});
	 });
});
