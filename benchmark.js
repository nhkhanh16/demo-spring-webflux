import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    one_shot_300: {
      executor: 'constant-arrival-rate',
      rate: 300,            // Tốc độ 300 request / giây
      timeUnit: '1s',
      duration: '1s',       // Chỉ bắn trong đúng 1 giây => Tổng cộng chính xác 300 request rồi DỪNG HẲN
      preAllocatedVUs: 300, // Chuẩn bị sẵn 300 luồng chờ nhận kết quả
      maxVUs: 300,
    },
  },
};

export default function () {
  const url = __ENV.TARGET_URL || 'http://localhost:8081/api/demo/blocking';
  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}