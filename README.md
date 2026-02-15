# 3D Photo Diary (GitHub Pages용)

원하신 것처럼 **GitHub에 올려서 바로 배포 가능한 Three.js 기반 웹사이트** 예시를 구성했습니다.

## 무엇이 구현되어 있나요?
- 3D 중심 오브젝트(토러스 매듭)가 부드럽게 회전/부유
- 주변에 사진 프레임이 원형으로 배치되어 공전
- 마우스 드래그/휠로 시점 이동 (`OrbitControls`)
- 정적 파일만으로 동작해서 GitHub Pages 배포에 적합

## 실행 방법 (로컬)
정적 서버로 실행하세요. (모듈 import 때문에 파일 직접 실행은 비권장)

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속.

## GitHub Pages 배포 방법
1. 이 폴더를 GitHub 저장소에 push
2. GitHub 저장소 `Settings > Pages`
3. `Deploy from a branch` 선택
4. 브랜치 `main` (또는 작업 브랜치 머지 후 `main`), 폴더 `/ (root)` 선택
5. 저장 후 1~2분 대기

## 커스터마이징 포인트
- `main.js`의 `photoUrls` 배열에 원하는 이미지 URL로 교체
- 프레임 배치 개수/반지름: `photoUrls`, `radius` 값 조정
- 오브젝트 형태 변경: `TorusKnotGeometry` 부분을 `BoxGeometry`, `SphereGeometry` 등으로 교체

## 참고 사이트 확인 관련
요청하신 참고 사이트(`https://www.choonsikdiary.com/`)는 현재 이 실행 환경에서 `403 Forbidden`으로 직접 확인이 제한되었습니다.
그래도 동일한 방향(3D 오브젝트 + 사진 감상형 인터랙션)의 기본 구조는 위 코드로 구현 가능하며,
원하시면 다음 단계로 참고 사이트 느낌에 더 가깝게(스크롤 스토리텔링, 패럴랙스, 섹션 전환, BGM/효과음, 모바일 최적화) 확장할 수 있습니다.
