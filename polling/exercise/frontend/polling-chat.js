const chat = document.getElementById("chat");
const msgs = document.getElementById("msgs");

// let's store all current messages here
let allChat = [];

// the interval to poll at in milliseconds
const INTERVAL = 3000;

// a submit listener on the form in the HTML
chat.addEventListener("submit", function (e) {
  e.preventDefault();
  postNewMsg(chat.elements.user.value, chat.elements.text.value);
  chat.elements.text.value = "";
});

async function postNewMsg(user, text) {
  // post to /poll a new message
  const data = { user, text };
  const options = {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const res = await fetch("/poll", options);
    const json = await res.json();
    console.log(json);
  } catch (e) {
    console.error("post polling error");
  }
}

async function getNewMsgs() {
  // poll the server
  let json;
  try {
    const res = await fetch("/poll");
    json = await res.json();
  } catch (e) {
    console.error("polling error", e);
  }
  allChat = json.msg;
  render();
}

function render() {
  // as long as allChat is holding all current messages, this will render them
  // into the ui. yes, it's inefficent. yes, it's fine for this example
  const html = allChat.map(({ user, text, time, id }) =>
    template(user, text, time, id)
  );
  msgs.innerHTML = html.join("\n");
}

// given a user and a msg, it returns an HTML string to render to the UI
const template = (user, msg) =>
  `<li class="collection-item"><span class="badge">${user}</span>${msg}</li>`;

let timeToMakeNextRequest = 0;
async function requestAnimationFrameTimer(time) {
  if (timeToMakeNextRequest <= time) {
    await getNewMsgs();
    timeToMakeNextRequest = time + INTERVAL;
  }
  requestAnimationFrame(requestAnimationFrameTimer);
}

// call it once to kick it off.
requestAnimationFrame(requestAnimationFrameTimer);

/**
 * A function to demonstrate the real usage of long polling.
 * Mindset:
 * 1- Client sends a request to the server with a msg.
 * 2- Server will not close the connection until it has msg to send.
 * 3- when a message appear, the server sends it to the client and end the connection.
 * 4- the client immediately sends a new request.
 * The situation when the browser sent a request and has a pending connection with the server, is standard for this method. Only when a message is delivered, the connection is reestablished.
 * If the connection is lost, because of, say, a network error, the client immediately sends a new request.
 */

async function subscribe() {
  try {
    const response = await fetch("/msgs");
    if (response.status === 502) {
      // connection timeout or error.
      // may happen when the connection was too pending for too long.
      // and the remote server closed it.
      // we need to reconnect again.
      await subscribe();
    } else if (response.status !== 200) {
      // An error occurred, log it.
      console.error(`Error occurred ${response.statusText}`);
      // reconnect in one second.
      await new Promise((resolve, reject) => setTimeout(resolve, 1000));
      await subscribe();
    } else {
      // log the message
      const message = await response.body();
      console.log(message);
      // get the next message
      await subscribe();
    }
  } catch (e) {
    console.error(e);
  }
}
