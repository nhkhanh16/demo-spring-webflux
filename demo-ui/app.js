let productStream;

function localUrl(id, path) {
	const url = new URL(document.querySelector(id).value.trim());
	if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
			|| !["http:", "https:"].includes(url.protocol)
			|| url.username || url.password || (path && url.pathname !== path)) {
		throw new Error("Hãy nhập URL localhost hợp lệ cho endpoint.");
	}
	return url;
}

function showResponse(result, body) {
	const time = body.match(/\d+\s*ms/);
	if (!time) {
		result.textContent = body;
		return;
	}

	const emphasis = document.createElement("strong");
	emphasis.textContent = time[0];
	result.replaceChildren(
		document.createTextNode(body.slice(0, time.index)),
		emphasis,
		document.createTextNode(body.slice(time.index + time[0].length))
	);
}

async function requestAggregate(name) {
	const status = document.querySelector(`#${name}-status`);
	const result = document.querySelector(`#${name}-result`);
	status.textContent = "Đang gửi GET…";
	try {
		const url = localUrl(`#${name}-url`, "/api/demo/aggregate");
		const response = await fetch(url, { cache: "no-store" });
		const body = await response.text();
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
		status.textContent = "Hoàn tất.";
		showResponse(result, body);
	} catch (error) {
		status.textContent = "Lỗi kết nối/CORS.";
		result.textContent = error.message;
	}
}

const aggregateButton = document.querySelector("#send-aggregate");
aggregateButton.addEventListener("click", async () => {
	aggregateButton.disabled = true;
	try {
		await Promise.all([requestAggregate("mvc"), requestAggregate("webflux")]);
	} finally {
		aggregateButton.disabled = false;
	}
});

function apiBase() {
	return localUrl("#webflux-url", "/api/demo/aggregate").origin;
}

function stopProductStream(message) {
	productStream?.close();
	productStream = undefined;
	document.querySelector("#start-stream").disabled = false;
	document.querySelector("#stop-stream").disabled = true;
	if (message) addProduct(message);
}

function addProduct(message) {
	const events = document.querySelector("#events");
	events.querySelector(".placeholder")?.remove();
	const item = document.createElement("li");
	item.textContent = message;
	events.append(item);
}

document.querySelector("#start-stream").addEventListener("click", () => {
	try {
		stopProductStream();
		document.querySelector("#events").replaceChildren();
		document.querySelector("#start-stream").disabled = true;
		document.querySelector("#stop-stream").disabled = false;
		const source = new EventSource(`${apiBase()}/api/demo/stream`);
		productStream = source;
		source.onmessage = ({ data }) => {
			if (productStream === source) addProduct(data);
		};
		source.onerror = () => {
			if (productStream === source) stopProductStream("Kết nối SSE đã đóng.");
		};
	} catch (error) {
		addProduct(error.message);
	}
});

document.querySelector("#stop-stream").addEventListener("click", () => {
	stopProductStream("Đã dừng stream.");
});
