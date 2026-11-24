# Demo Spring MVC và Spring WebFlux

Hai ứng dụng Spring Boot độc lập minh họa blocking, non-blocking, streaming và tổng hợp nhiều tác vụ.

## Tổng quan

| Project | Công nghệ | Cổng | Truy cập |
|---|---|---:|---|
| `demospringboot` | Spring MVC, Spring Data JPA | `8081` | `http://localhost:8081` |
| `demowebflux` | Spring WebFlux, Spring Data R2DBC | `8080` | `http://localhost:8080` |
| `demo-ui` | Giao diện HTML/CSS/JS độc lập | `5500` | `http://localhost:5500` |

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

## Giao diện demo độc lập

Sau khi khởi chạy cả hai ứng dụng, mở terminal tại thư mục repository và chạy:

```powershell
python -m http.server 5500 --directory .\demo-ui
```

Mở `http://localhost:5500`. Giao diện dùng endpoint `/api/demo/aggregate` sẵn có của MVC và WebFlux để so sánh tuần tự/đồng thời, đồng thời hiển thị SSE từ WebFlux. CORS chỉ cho phép giao diện ở `http://localhost:5500` hoặc `http://127.0.0.1:5500`; giao diện chỉ nhận URL loopback.

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

Khi cả hai ứng dụng đang chạy, mở terminal tại thư mục repository và chạy:

```powershell
python .\load_test.py --requests 240 --concurrency 240
```

Công cụ gửi cùng số request lần lượt đến MVC `/api/demo/blocking` và WebFlux `/api/demo/non-blocking`, sau đó in số request thành công, tổng thời gian và thời gian phản hồi trung bình/lâu nhất. Cả hai endpoint đều chờ khoảng 5 giây; MVC dùng `Thread.sleep`, còn WebFlux dùng luồng reactive.

Thử tải nhẹ trước bằng `--requests 40 --concurrency 20`. Giá trị tối đa được giới hạn ở 600 request và 600 request đồng thời; script chỉ gọi hai địa chỉ `localhost` đã cấu hình sẵn. Tăng tải từ từ để tránh làm máy quá tải. Đây là demo so sánh trong môi trường local, không phải công cụ benchmark tổng quát. Kết quả phụ thuộc máy và cấu hình; WebFlux vẫn bị giới hạn bởi tài nguyên, event loop và connection pool.

### Chạy load test bằng Postman

Collection có sẵn tại [WebFlux Load Test.postman_collection.json](./postman/WebFlux%20Load%20Test.postman_collection.json). Nó có hai folder tách biệt:

- **MVC - Blocking** gọi `http://localhost:8081/api/demo/blocking`.
- **WebFlux - Non-blocking** gọi `http://localhost:8080/api/demo/non-blocking`.

Các request đều chờ khoảng 5 giây để workload tương đương. Hai URL có thể sửa trong collection variables `mvcBaseUrl` và `webfluxBaseUrl`.

1. Khởi chạy cả hai ứng dụng như hướng dẫn ở trên.
2. Trong Postman, chọn **Import** và mở file collection vừa tải.
3. Chọn folder **MVC - Blocking**, mở **Run**, đặt **Run type** là **Performance** và **Run method** là **App** để chạy tải từ Postman Desktop trên máy local.
4. Chọn load profile **Fixed**, bắt đầu với **5 virtual users** trong **1 phút**, rồi **Start run**.
5. Lặp lại với folder **WebFlux - Non-blocking**, giữ nguyên số virtual users, thời lượng và load profile.
6. So sánh response time (đặc biệt p95), throughput, error rate và CPU/RAM của máy chạy Postman. Tăng tải từ từ nếu máy và hai ứng dụng vẫn ổn định.

Chỉ chạy **một folder mỗi lần** để hai bài đo không cạnh tranh tài nguyên. Chọn **Performance**, không chọn **Functional**: Functional Collection Runner chạy các request theo thứ tự lặp lại, còn Performance dùng virtual users chạy song song. Dùng **App/local run** vì Postman Cloud không thể gọi các URL `localhost`. Tham khảo [Postman Performance Testing](https://learning.postman.com/docs/tests-and-scripts/performance-testing/testing-api-performance/) và [cấu hình performance test](https://learning.postman.com/docs/tests-and-scripts/performance-testing/performance-test-configuration/).

cấu hình để sửa số theard trong threadpool tomcat
server.tomcat.threads.max=400


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
