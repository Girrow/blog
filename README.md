# 3D Photo World (Three.js + GitHub Pages)

요청하신 방향에 맞춰 기존 단일 장면 데모를 **스테이지 기반 3D 마이크로사이트** 형태로 개편했습니다.

## 핵심 반영 사항
- **스테이지 기반 월드 구성**: `Gallery Gate → Memory Plaza → Sky Archive` 3개 구역
- **캐릭터 이동/탐험**: WASD(또는 방향키)로 조작, 포털로 다음 스테이지 이동
- **상태머신 기반 액터 상태**: `Idle / Run / Interact`
- **사진을 3D 오브젝트로 배치**: 각 스테이지 벽면에 포스터(사진)로 전시
- **발견형 설계**: 스테이지별 이스터에그 오브젝트 탐색
- **동적 연출 조명 + 최적화 고려**
  - 동적 조명 사용(디렉셔널 + 포인트)
  - 지오메트리/머티리얼 재사용(공유 머티리얼 중심)
  - 단순 지오메트리 위주로 폴리곤 수를 과도하게 늘리지 않도록 구성

## 조작법
- 이동: `WASD` / 방향키
- 인터랙션: `E` (포털 이동, 이스터에그 발동)
- 카메라: 마우스 드래그

## 로컬 실행
```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

## GitHub Pages 배포
1. 저장소에 push
2. `Settings > Pages`
3. `Deploy from a branch`
4. 브랜치/폴더: `main` + `/ (root)`
5. 배포 URL 접속

## 커스터마이징
- 이미지 교체: `main.js`의 `posterTextures` URL 교체
- 스테이지 추가: `stages` 배열에 구역 추가 후 `createStage` 로직 재사용
- 상태 확장: `state.actor`를 `Jump`, `Talk`, `PhotoMode` 등으로 확장
