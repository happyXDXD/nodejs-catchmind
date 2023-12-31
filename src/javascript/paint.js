const username = prompt("닉네임을 입력하세요.");

// 닉네임이 빈값이거나 없다면
if (username === null || username.trim() === "") {
  // 메인페이지로 이동
  window.location.href = "/";
}

const canvasSocket = io("/canvas");

const canvas = document.getElementById("jsCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 500;
canvas.height = 500;

ctx.strokeStyle = "black";
ctx.lineWidth = 2.5;

/////////////////////////////////////////////////////////

// 현재 접속되어있는 주소
const currentPath = window.location.pathname;

// 마지막 자리 글자가 방 번호라서 추출하기
const roomId = currentPath.slice(currentPath.lastIndexOf("/") + 1);

// 방 입장시 현재 그 방에 내가 적은 이름과 똑같은 이름이 존재한지 안한지 확인하는 Fetch api
fetch("/checkDuplicate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ username, roomId }),
})
  .then((response) => response.json())
  .then((result) => {
    //중복 이름이 존재하면
    if (result.result) {
      alert("중복된 이름이 존재합니다.");
      window.location.href = "/room";
    }
  })
  .catch((error) => console.error(error));

canvasSocket.emit("joinRoom", roomId);

// 마우스를 누른상태 X => false, 누른상태 => o
let painting = false;

// 처음 접속하면 모든 클라이언트들은 false로 되어 모두 그림을 그릴 수 있게함
let drawingTool = false;

//마우스를 클릭하면 실행되는 함수
function startPainting() {
  if (drawingTool) {
    return;
  }

  painting = true;
}

//마우스를 클릭했다가 때면 실행되는 함수
function stopPainting(event) {
  painting = false;
}

//마우스를 움직이면 실행되는 함수
function onMouseMove(event) {
  if (drawingTool) {
    return;
  }

  const x = event.offsetX;
  const y = event.offsetY;

  if (!painting) {
    ctx.beginPath();
    ctx.moveTo(x, y);

    // 서버로 새로운 경로를 시작한다는 신호 전송
    canvasSocket.emit("draw", { x, y, start: true });
  } else {
    ctx.lineTo(x, y);
    ctx.stroke();

    // 서버로 그린 데이터 전송
    canvasSocket.emit("draw", { x, y, start: false });
  }
}

// 캔버스에 동작이 감지될때
if (canvas) {
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", startPainting);
  canvas.addEventListener("mouseup", stopPainting);
  canvas.addEventListener("mouseleave", stopPainting);
}

// 어떤 클라이언트로 부터 그림을 그리면 서버로부터 그리고 있는 정보를 실시간으로 받아와서 그린 사람을 제외한 같은 방에 모든 클라이언트에서 데이터를 받음
canvasSocket.on("draw", onDraw);

function onDraw(data) {
  /**
   * @param data.start 그리는 여부
   */
  if (data.start) {
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
  } else {
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  }
}

// 게임이 시작되거나 턴이 바뀌거나, 게임이 종료되면 캔버스 깨끗하게 초기화를 하는 함수
function onCanvasInit() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 게임이 시작되거나 턴이 바뀔때 모든 클라이언트에게 일단 그림을 그릴수 없게 하는 함수
function isPainterPaint() {
  drawingTool = true;
}

// 그림 지우기 버튼
const clear_button = document.getElementById("clear-button");

// 처음 모든 클라이언트는 그림을 지우는 권한을 가지고 있다.
let isClearAuthority = true;

clear_button.addEventListener("click", function () {
  if (isClearAuthority) {
    onCanvasInit();
    canvasSocket.emit("clear-canvas");
  }
});

// 서버로 부터 클라이언트에게 그림을 지우도록 명령받음
canvasSocket.on("clear-canvas", onClearCanvas);

function onClearCanvas() {
  onCanvasInit();
}
