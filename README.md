# Choonsik Mini World (GitHub Pages 배포용)

클릭/터치만으로 이동하는 Three.js 미니 월드입니다. 키보드 없이도 동작하도록 설계해서 모바일에서도 동일한 조작이 가능합니다.

## 구현 내용
- **클릭/터치 이동**: 바닥 클릭 시 해당 위치로 이동
- **클릭 상호작용**: 포털 클릭으로 다음 스테이지 이동, 오브젝트 클릭으로 이스터에그 발견
- **모바일 호환**: `pointer` 이벤트 기반 제어 + 반응형 HUD
- **GitHub Pages 친화 구조**: 번들러 없이 정적 파일(`index.html`, `main.js`, `style.css`)로 실행
- **레퍼런스 톤 반영**: 밝은 그리드 바닥 + 파스텔 컬러 + 버스 오브젝트 중심 디자인

## 로컬 실행
```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

## GitHub Pages 배포 방법
1. 저장소에 push
2. GitHub 저장소 `Settings > Pages`
3. `Deploy from a branch` 선택
4. 브랜치와 `/ (root)` 선택 후 저장
5. 배포 URL에서 즉시 확인

## 커스터마이징
- 스테이지 이름/위치: `main.js`의 `stages`
- 색감 변경: `shared` 머티리얼 컬러
- 스티커(포스터) 스타일: `stickerTexture` 함수
