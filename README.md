# muNote

Notion 스타일의 무한 계층 트리뷰 + 블록 에디터를 React + TypeScript 로 구현한 학습용 프로젝트입니다.

**샘플 데모**: https://ddukbaek2.com/portfolio/muNote/

## 주요 기능

- **무한 계층 트리** — 드래그로 순서·계층 자유 변경, 인라인 라벨 편집, 추가 / 삭제 / 복제 / 색상
- **블록 에디터** — 텍스트, 제목(H1 / H2 / H3), 체크리스트, 코드, 수평선
- **코드 하이라이팅** — `highlight.js` 기반 18+ 언어 자동 하이라이트, 줄번호 상시 표시, `Tab` 입력, 클립보드 복사
- **다크 / 라이트 테마** — `localStorage` 영속화, `prefers-color-scheme` fallback
- **상시 자동 저장** — 모든 변경이 즉시 `localStorage` 에 동기화
- **데이터 내보내기 / 가져오기** — JSON 파일로 백업 / 복원
- **콘텐트별 설정** — 제목 표시, 문서 경로 표시, 문서 영역 구분 토글
- **트리 사이드바** — 노션식 숨김 / 펼침, 드래그 리사이저(200~600px)

## 기술 스택

- React 18 + TypeScript (strict)
- Vite (빌드 / dev 서버)
- @dnd-kit/core, @dnd-kit/sortable (드래그앤드랍)
- highlight.js (코드 하이라이팅)