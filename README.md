# Demo Spring MVC và Spring WebFlux

Hai ứng dụng Spring Boot độc lập minh họa blocking, non-blocking, streaming và tổng hợp nhiều tác vụ.

## Tổng quan

| Project | Công nghệ | Cổng | Truy cập |
|---|---|---:|---|
| `demospringboot` | Spring MVC, Spring Data JPA | `8081` | `http://localhost:8081` |
| `demowebflux` | Spring WebFlux, Spring Data R2DBC | `8080` | `http://localhost:8080` |

Cả hai dùng H2 trong bộ nhớ và khởi tạo dữ liệu mẫu khi chạy. Yêu cầu Java 17 trở lên. Mỗi project có Maven Wrapper nên không cần cài Maven riêng.

## Khởi chạy

Mở hai terminal tại thư mục repository nếu muốn chạy đồng thời.

**Terminal 1 — Spring MVC**

```powershell
cd .\demospringboot
chcp 65001; .\mvnw.cmd spring-boot:run
```

**Terminal 2 — Spring WebFlux**

```powershell
cd .\demowebflux
chcp 65001; .\mvnw.cmd spring-boot:run
```

Đợi ứng dụng khởi động xong rồi gửi request đến endpoint tương ứng bên dưới.

## API demo

### Spring MVC — `http://localhost:8081`

- `GET /api/demo/blocking` — Chờ 5 giây rồi đọc sản phẩm; request thread bị chặn.
- `GET /api/demo/aggregate` — Truy vấn số sản phẩm, sản phẩm đắt nhất và giá trung bình tuần tự; mỗi thao tác thêm 1 giây chờ, tổng khoảng 3 giây.

### Spring WebFlux — `http://localhost:8080`

- `GET /api/demo/non-blocking` — Đọc sản phẩm bằng R2DBC và chờ bất đồng bộ
- `GET /api/demo/stream` — Gửi sản phẩm dạng SSE, mỗi sản phẩm cách nhau khoảng 1 giây.
- `GET /api/demo/aggregate` — Chạy ba truy vấn trên bằng `Mono.zip`; mỗi truy vấn thêm 1 giây chờ reactive nên tổng khoảng 1 giây.

### Lệnh gọi Spring MVC

```powershell
curl.exe http://localhost:8081/api/demo/blocking
curl.exe http://localhost:8081/api/demo/aggregate
```

### Lệnh gọi Spring WebFlux

```powershell
# curl.exe http://localhost:8080/api/demo/non-blocking
curl.exe -N http://localhost:8080/api/demo/stream
curl.exe http://localhost:8080/api/demo/aggregate
```

Tùy chọn `-N` giúp `curl` hiển thị các sự kiện streaming ngay khi nhận được.

## Demo tải đồng thời

Có hai cách tạo tải: k6 để phát một đợt request ngắn và Postman Performance để mô phỏng người dùng lặp request trong một khoảng thời gian.

### k6 — phát 300 request trong một đợt

`benchmark.js` dùng Grafana k6 với `constant-arrival-rate`: mục tiêu là bắt đầu 300 iteration trong 1 giây. Mỗi iteration gửi một GET; có tối đa 300 k6 virtual users được chuẩn bị. Đây là **300 virtual users**, không phải 300 OS thread, và request được dàn đều trong khoảng một giây chứ không đến cùng một thời điểm chính xác. k6 có thể báo `dropped_iterations` nếu không đủ virtual users hoặc máy tạo tải không theo kịp cấu hình. [Tài liệu k6 về constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)

Cài k6 trước, khởi động ứng dụng đích, rồi chạy tại thư mục repository:

```powershell
# MVC: TARGET_URL mặc định trỏ tới endpoint này
k6 run .\benchmark.js

# WebFlux
k6 run -e TARGET_URL=http://localhost:8080/api/demo/non-blocking .\benchmark.js
```

Script mặc định gọi `http://localhost:8081/api/demo/blocking`. Có thể truyền `TARGET_URL` để đổi endpoint. Mỗi request kiểm tra HTTP 200. Chạy lần lượt từng ứng dụng, không đồng thời, để tránh hai lần đo tranh tài nguyên. Các iteration kéo dài đến khi response hoàn tất; vì vậy thời gian tiến trình k6 chạy sẽ dài hơn 1 giây.

Để xuất báo cáo HTML trong PowerShell:

```powershell
$env:K6_WEB_DASHBOARD = "true"
$env:K6_WEB_DASHBOARD_EXPORT = "mvc-report.html"
k6 run .\benchmark.js

$env:K6_WEB_DASHBOARD_EXPORT = "webflux-report.html"
k6 run -e TARGET_URL=http://localhost:8080/api/demo/non-blocking .\benchmark.js

Remove-Item Env:K6_WEB_DASHBOARD
Remove-Item Env:K6_WEB_DASHBOARD_EXPORT
```

k6 xuất báo cáo tự động khi bật `K6_WEB_DASHBOARD_EXPORT`. [Tài liệu k6 về dashboard và HTML report](https://grafana.com/docs/k6/latest/results-output/web-dashboard/).

Hai báo cáo hiện có trong repository ghi lại một lần chạy mẫu:

| Ứng dụng | Request | Thành công | Trung bình | P95 | P99 |
|---|---:|---:|---:|---:|---:|
| MVC `/blocking` | 300 | 300 | 6,46 giây | 9,36 giây | 9,36 giây |
| WebFlux `/non-blocking` | 300 | 300 | 5,01 giây | 5,02 giây | 5,02 giây |

Trong lần chạy này, thời gian trung vị MVC khoảng 5,01 giây nhưng P90 gần 9,36 giây; phù hợp với việc một phần request phải chờ worker Tomcat rảnh. WebFlux có P95 gần 5,02 giây. Đây là kết quả của đúng máy và đúng lần chạy đó, không phải cam kết hiệu năng chung. Mở [mvc-report.html](./mvc-report.html) và [webflux-report.html](./webflux-report.html) để xem biểu đồ và số liệu đầy đủ.

### Cấu hình Tomcat trong demo

Trong `demospringboot/src/main/resources/application.properties`:

- `server.tomcat.threads.max=10` hiện đang bị comment nên **không có hiệu lực**. Spring Boot mặc định tối đa 200 worker thread; có thể khai báo rõ `server.tomcat.threads.max=200` để cố định cấu hình cho bài trình bày.
- `server.tomcat.accept-count=1000` đặt độ dài backlog kết nối của hệ điều hành khi đã đạt giới hạn `max-connections`; nó không tăng số worker thread và không phải hàng đợi task của worker pool.
- `server.tomcat.max-connections=10000` đặt giới hạn kết nối đồng thời, không phải giới hạn thread xử lý request.

Với giới hạn worker 200 và đợt 300 request, 200 request đầu có thể được xử lý trước; phần còn lại phải đợi thread rảnh. Để chứng minh chính xác hàng đợi, cần xem `dropped_iterations`, log thread hoặc metrics của server cùng với thời gian phản hồi.

### Chạy load test bằng Postman

Collection có sẵn tại [WebFlux Load Test.postman_collection.json](./postman/WebFlux%20Load%20Test.postman_collection.json). Nó có hai folder tách biệt:

- **MVC - Blocking** gọi `http://localhost:8081/api/demo/blocking`.
- **WebFlux - Non-blocking** gọi `http://localhost:8080/api/demo/non-blocking`.

Các request đều chờ khoảng 5 giây để workload tương đương. Hai URL có thể sửa trong collection variables `mvcBaseUrl` và `webfluxBaseUrl`.

Collection còn có folder **API Demo** với hai nhóm **Spring MVC** và **Spring WebFlux**, chứa các endpoint bổ sung: aggregate của cả hai ứng dụng và SSE. Hai request blocking/non-blocking đã nằm trong các folder load test phía trên nên không bị lặp ở đây. Dùng **API Demo** để gửi thử aggregate/SSE; với Performance chỉ chọn hai folder load test chuyên biệt để so sánh workload tương đương.

1. Khởi chạy cả hai ứng dụng như hướng dẫn ở trên.
2. Trong Postman, chọn **Import** và mở file collection vừa tải.
3. Chọn folder **MVC - Blocking**, mở **Run**, đặt **Run type** là **Performance** và **Run method** là **App** để chạy tải từ Postman Desktop trên máy local.
4. Chọn load profile **Fixed**, bắt đầu với **5 virtual users** trong **1 phút**, rồi **Start run**.
5. Lặp lại với folder **WebFlux - Non-blocking**, giữ nguyên số virtual users, thời lượng và load profile.
6. So sánh response time (đặc biệt p95), throughput, error rate và CPU/RAM của máy chạy Postman. Tăng tải từ từ nếu máy và hai ứng dụng vẫn ổn định.

Chỉ chạy **một folder mỗi lần** để hai bài đo không cạnh tranh tài nguyên. Trong Performance, mỗi virtual user lặp request trong suốt thời gian chạy; đặt 200 VU không có nghĩa tổng cộng chỉ có 200 request. Dùng **App/local run** để gọi các URL `localhost`. Tham khảo [Postman Performance Testing](https://learning.postman.com/docs/tests-and-scripts/performance-testing/testing-api-performance/) và [cấu hình Performance](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/).


## Ý nghĩa và lưu ý

- **Blocking và non-blocking:** `/blocking` và `/non-blocking` đều có thể mất khoảng 5 giây để trả kết quả. Điểm khác biệt là thao tác chờ trong MVC chặn request thread, còn Reactor không dùng `Thread.sleep` để chờ.
- **Streaming:** `/stream` gửi dữ liệu từng phần để client có thể xử lý trước khi toàn bộ danh sách được phát xong.
- **Tổng hợp tác vụ:** Cả hai endpoint truy vấn database để lấy số sản phẩm, sản phẩm có giá cao nhất và giá trung bình; mỗi thao tác có thêm 1 giây chờ giả lập. MVC chờ tuần tự nên tổng khoảng 3 giây; WebFlux kết hợp các thao tác bằng `Mono.zip` nên ba khoảng chờ diễn ra đồng thời, tổng khoảng 1 giây.

Thời gian chỉ mang tính minh họa và có thể dao động. `Mono.delay` mô phỏng chờ bất đồng bộ; nó không tự biến mọi lời gọi I/O thành reactive hay song song. Trong ứng dụng thực tế, nguồn dữ liệu và client I/O cũng cần hỗ trợ reactive để tận dụng WebFlux. Non-blocking không có nghĩa mỗi tác vụ luôn chạy trên một thread riêng.

## Chạy kiểm thử

Chạy các lệnh sau từ thư mục repository:

```powershell
cd .\demospringboot
.\mvnw.cmd test
cd ..\demowebflux
.\mvnw.cmd test
```
