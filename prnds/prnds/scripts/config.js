var isConnected = false;

var socket = io.connect('http://localhost:3000');

socket.on('socket:msg', function (data) {
  console.log("Message Arrived = ", data);
  switch (data.type) {
    case "socket.connected":
      isConnected = data.msg.serialConnected;
      showConnectOrDisconnect();
      break;
    case "socket.connect.error":
      showModal("Connection Error", data.msg.error);
      showConnectOrDisconnect();
      break;
    case "socket.configuration":
      $("#txtPort").val(data.msg.current.port);
      $("#txtBaudRate").val(data.msg.current.baudRate);
      $("#portList").html(data.msg.availablePorts.join("<br/>"));
      $("#chkAutoOpen").prop("checked", data.msg.current.autoOpen);

      $("#txtSavedPort").val(data.msg.current.port);
      $("#txtSavedBaudRate").val(data.msg.current.baudRate);
      $("#chkSavedAutoOpen").prop("checked", data.msg.current.autoOpen);

      isConnected = data.msg.serialConnected;
      showConnectOrDisconnect();

      if (data.msg.changed) {
        showModal("Reconnect Success", data.msg.response);
      }
      break;
    case "shifter.connected":
      $("#shifterStatus").text(data.msg.response || data.msg.error);
      break;
    default:
      break;
  }

});

function showConnectOrDisconnect() {
  if (isConnected) {
    $("#btnConnect").hide();
    $("#btnDisconnect").show();
    $("#connectionStatus").text("CONNECTED");
  } else {
    $("#btnConnect").show();
    $("#btnDisconnect").hide();
    $("#connectionStatus").text("DISCONNECTED");
  }
}

function showModal(title, message) {
  infoModal.title = title;
  infoModal.message = message;

  $('#infoModal').modal();
}

$('#infoModal').on('show.bs.modal', function (event) {
  var modal = $(this)
  modal.find('.modal-title').text(infoModal.title);
  modal.find('.modal-body').text(infoModal.message);

  infoModal = {};
})


$(document).ready(function () {
  resetPageState();

  socket.emit('socket:msg', {
    type: "serial.configuration",
    msg: null
  });
});

$("#btnChange").click(function () {
  $("#btnChange").hide();
  $("#btnRefresh").hide();

  $("#availablePorts").show();
  $("#btnCancel").show();
  $("#btnReconnect").show();
  $("#btnReconnectAndSave").show();
  $("#txtPort").prop("disabled", false);
  $("#txtBaudRate").prop("disabled", false);
  $("#chkAutoOpen").prop("disabled", false);
});

$("#btnCancel").click(function () {
  socket.emit('socket:msg', {
    type: "serial.configuration",
    msg: null
  });

  resetPageState();
});

$("#btnRefresh").click(function () {
  socket.emit('socket:msg', {
    type: "serial.configuration",
    msg: null
  });

  resetPageState();
});

$("#btnReconnect").click(function () {
  socket.emit('socket:msg', {
    type: "serial.reconnect",
    msg: {
      port: $("#txtPort").val(),
      baudRate: Number($("#txtBaudRate").val()),
      autoOpen: $("#chkAutoOpen").prop("checked")
    }
  });

  resetPageState();
});

$("#btnReconnectAndSave").click(function () {
  socket.emit('socket:msg', {
    type: "serial.reconnect.save",
    msg: {
      port: $("#txtPort").val(),
      baudRate: Number($("#txtBaudRate").val()),
      autoOpen: $("#chkAutoOpen").prop("checked")
    }
  });

  resetPageState();
});

$("#btnConnect").click(function () {
  socket.emit('socket:msg', {
    type: "serial.connect",
    msg: {}
  });
});

$("#btnDisconnect").click(function () {
  socket.emit('socket:msg', {
    type: "serial.disconnect",
    msg: {}
  });
});

$("#btnTestShifterConnection").click(function () {
  socket.emit('socket:msg', {
    type: "shifter.connected",
    msg: null
  });

  resetPageState();
});

function resetPageState() {
  $("#txtPort").prop("disabled", true);
  $("#txtBaudRate").prop("disabled", true);
  $("#chkAutoOpen").prop("disabled", true);

  $("#btnChange").show();
  $("#btnRefresh").show();

  $("#btnCancel").hide();
  $("#btnReconnect").hide();
  $("#btnReconnectAndSave").hide();

  $("#btnConnect").hide();
  $("#btnDisconnect").hide();
 
  $("#availablePorts").hide();

  $("#btnTestShifterConnection").hide();

  showConnectOrDisconnect();
}
