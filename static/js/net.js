// WebSocket connection to the server, with automatic reconnect.

export class Net {
  constructor(getJoinData, onMessage, onStatus) {
    this.getJoinData = getJoinData;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.ws = null;
  }

  connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", ...this.getJoinData() }));
      this.onStatus(true);
    };
    ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.onStatus(false);
      setTimeout(() => this.connect(), 2000);
    };
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}
