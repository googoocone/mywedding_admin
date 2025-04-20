// utils/naverGeocode.ts

declare global {
  interface Window {
    naver: any;
  }
}

export const getCoordinatesByAddress = (address: string): Promise<{ lat: string; lng: string } | null> => {
  return new Promise((resolve, reject) => {
    if (!window.naver) {
      reject("네이버 지도 스크립트가 아직 로드되지 않았습니다.");
      return;
    }

    const geocoder = window.naver.maps.Service;
    geocoder.geocode(
      {
        query: address,
      },
      (status: string, response: any) => {
        if (status !== window.naver.maps.Service.Status.OK) {
          reject("주소 변환 실패");
          return;
        }

        const result = response.v2;
        const { x, y } = result.addresses[0];
        resolve({ lat: y, lng: x }); // 위도, 경도
      }
    );
  });
};
