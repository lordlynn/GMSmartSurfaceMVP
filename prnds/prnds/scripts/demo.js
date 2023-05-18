
var enableLogging = true;

var statusSerialConnected = false;
var statusConnecting = false;

var infoModal = {
	title: undefined,
	message: undefined
}

// button states
var brakeState = true;
var parkState = true;
var driveState = false;
var sportState = false;
var neutralState = false;
var revState = false;
var emptyState = false;
var fullState = false;

//message format
// {
// 	type: "socket.connected",
// 	msg: {
// 		connected: true
// 	}
// }
var socket = io.connect('http://localhost:3000');

socket.on('socket:msg', function (data) {
	logMessage("Message Arrived = ", data);
	switch (data.type) {
		case "socket.connected":
			logMessage("Socket Connected Message", data.msg.serialConnected);
			statusSerialConnected = data.msg.serialConnected;
			statusConnecting = false;
			// -------------- AFTER BROWSER HAS CONNECTED DO SOMETHING HERE --------------
			setConnectedImage();
			partSync();
			break;
		case "socket.connect.error":
			showErrorAlert(data.msg.error);
			logMessage("Socket Error Message", data.msg.error);
			statusSerialConnected = data.msg.serialConnected;
			statusConnecting = false;
			setConnectedImage();
			break;
		case "socket.part.event":
			logMessage(data);
			processShifterEvent(data.msg.code);
			break;
		default:
			break;
	}

});

function showErrorAlert(message) {
	$('#errorAlert').text(message);
	$('#errorAlert').show();
	setTimeout(function () {
		$("#errorAlert").hide();
	}, 5000);
}

$('#errorAlert').hide();

// ------------------------- SETUP LISTENERS FOR GUI IMAGES -------------------------
// document.addEventListener('DOMContentLoaded', function () {
// 	document.getElementById("drive_img").addEventListener("click", clickDriveHandler);
// 	document.getElementById("brake_img").addEventListener("click", clickBrakeHandler);
// 	document.getElementById("park_img").addEventListener("click", clickParkHandler);
// 	document.getElementById("sport_img").addEventListener("click", clickSportHandler);
// 	document.getElementById("neutral_img").addEventListener("click", clickNeutralHandler);
// 	document.getElementById("rev_img").addEventListener("click", clickRevHandler);
// 	document.getElementById("engine_img").addEventListener("click", connectButtonHandler);
// 	document.getElementById("empty_txt").addEventListener("click", clickEmptyHandler);
// 	document.getElementById("full_txt").addEventListener("click", clickFullHandler);
// });


// ------------------------- CLICK ON BRAKE TO UPDATE SHIFTER STATE -------------------------
// function clickBrakeHandler() {
// 	if (statusSerialConnected) {
// 		logMessage("EVENT : BRAKE : STATE : ", brakeState);

// 		emitEvent('event.brake', !brakeState);
// 	}
// }


// ------------------------- CLICK ON INDICATORS TO UPDATE SHIFTER STATE -------------------------
// function clickNeutralHandler() {
// 	if (!neutralState && statusSerialConnected) {
// 		logMessage("EVENT : NEUTRAL : STATE : ", neutralState);

// 		emitEvent('event.indicator', 'N');
// 	}
// }

// function clickRevHandler() {
// 	if (!revState && statusSerialConnected) {
// 		logMessage("EVENT : REVERSE : STATE : ", revState);

// 		emitEvent('event.indicator', 'R');
// 	}
// }

// function clickSportHandler() {
// 	if (!sportState && statusSerialConnected) {
// 		logMessage("EVENT : SPORT : STATE : ", sportState);

// 		emitEvent('event.indicator', 'S');
// 	}
// }

// function clickParkHandler() {
// 	if (!parkState && statusSerialConnected) {
// 		logMessage("EVENT : PARK : STATE : ", parkState);

// 		emitEvent('event.indicator', 'P');
// 	}
// }

// function clickDriveHandler() {
// 	if (!driveState && statusSerialConnected) {
// 		logMessage("EVENT : DRIVE : STATE : ", driveState);

// 		emitEvent('event.indicator', 'D');
// 	}
// }

// function clickEmptyHandler() {
// 	if (statusSerialConnected) {
// 		logMessage("EVENT : DRIVE : STATE : ", emptyState);

// 		emitEvent('event.indicator', 'E');
// 	}
// }

// function clickFullHandler() {
// 	if (statusSerialConnected) {
// 		logMessage("EVENT : DRIVE : STATE : ", fullState);

// 		emitEvent('event.indicator', 'F');
// 	}
// }

function emitEvent(eventName, eventState) {
	socket.emit('socket:msg', {
		type: eventName,
		msg: {
			state: eventState
		}
	});
}

function connectButtonHandler() {
	logMessage("EVENT : CONNECT : STATE : ", statusSerialConnected);

	if (!statusSerialConnected) {
		socket.emit('socket:msg', {
			type: "serial.connect",
			msg: {
				socketId: socket.id
			}
		});

		statusConnecting = true;
	}
}

function partSync() {
	socket.emit('socket:msg', {
		type: "part.sync",
		msg: {
			socketId: socket.id
		}
	});
}

function processShifterEvent(code) {
	switch (code) {
		case 85:
			document.getElementById("brake_img").src = "./images/brake_on.png";
			brakeState = true;
			break;
		case 76:
			document.getElementById("brake_img").src = "./images/brake_off.png";
			brakeState = false;
			break;
		// TESTING HERE
		case 68:
			clearIndicatorState();
			driveState = true;
			const drive = document.getElementById("drive_img");
			drive.style.transform = 'rotate(90deg)';
			drive.style.transform = 'translate(500px, 500px)';

			break;
		case 80:
			clearIndicatorState();
			parkState = true;
			document.getElementById("park_img").src = "./images/p_selected.png";
			break;
		case 83:
			clearIndicatorState();
			sportState = true;
			document.getElementById("sport_img").src = "./images/s_selected.png";
			break;
		case 82:
			clearIndicatorState();
			revState = true;
			document.getElementById("rev_img").src = "./images/r_selected.png";
			break;
		case 78:
			clearIndicatorState();
			neutralState = true;
			document.getElementById("neutral_img").src = "./images/n_selected.png";
			break;
		default:
			break;
	}

}

function clearIndicatorState() {
	parkState = false;
	driveState = false;
	sportState = false;
	revState = false;
	neutralState = false;

	const drive = document.getElementById("drive_img");
	// document.getElementById("drive_img").src = "./images/d.png";
	drive.style.transform = 'rotate(0deg)';
	drive.style.transform = 'translate(0px,0px)';



	document.getElementById("park_img").src = "./images/p.png";
	document.getElementById("sport_img").src = "./images/s.png";
	document.getElementById("rev_img").src = "./images/r.png";
	document.getElementById("neutral_img").src = "./images/n.png";
}

function setConnectedImage() {
	if (statusSerialConnected) {
		document.getElementById("engine_img").src = "./images/engine_unlit.png";
	} else {
		document.getElementById("engine_img").src = "./images/engine_lit.png";
	}
}

function logMessage(message, data) {
	if (enableLogging) {
		console.log(message, data);
	}
}