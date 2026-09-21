# Xenon Valkyrie+ (제논 발키리+)

> 별칭·DB 표기: Project Xenon Valkyrie+  
> 대상 판본: **PlayStation Vita**  
> 상태: **🟢 후보** / 발굴 추천도: **⭐⭐⭐½☆ 3.5/5** / 한글화 우선도: **C**  
> 조사 기준일: **2026-09-21 / Asia/Seoul**

> [!IMPORTANT]
> Xenon Valkyrie+는 2017년 PC용 `Xenon Valkyrie`를 COWCAT이 PS Vita용으로 재작업한 강화판이다. Vita판은 2017-12-19 북미·유럽에 출시됐고, 원작 피드백을 반영한 게임플레이 개선과 Vita용 조작 변경이 들어갔다. 이후 PS4·Xbox One·Switch·PS5로 같은 `+` 계열이 확장됐다. 공식 한국어와 공개 Vita 한국어 패치는 2026-09-21 기준 확인되지 않는다.

## 한눈에 보기

| 항목 | 내용 |
|---|---|
| 원제 / 공식 제목 | Xenon Valkyrie+ |
| DB 별칭 | Project Xenon Valkyrie+ |
| 한글 제목 | 제논 발키리+ |
| 플랫폼 | PlayStation Vita |
| 발매일 | 북미·유럽 2017-12-19 |
| 개발사 | Diabolical Mind |
| Vita 이식·발매 | COWCAT |
| 제품 코드 | 북미 PCSE-01191 / 유럽 PCSB-01202 |
| 장르 | 2D 로그라이트 플랫폼 액션 / RPG |
| 원산지 / 원문 언어 | 스페인 개발 / 영어·프랑스어·스페인어·독일어·이탈리아어 지원 |
| 예상 플레이타임 | Vita 대형 표본 미확인 / 동일 +판 PS4 GameFAQs 평균 10.4시간·10명 참고 |
| 발굴 추천도 | ⭐⭐⭐½☆ **3.5/5** |
| 상태 | 🟢 후보 |
| 한글화 우선도 | **C** |
| 한글화 난이도 | **미확인**. GameMaker Studio 사용은 공식 확인되지만 Vita 번역용 추출·재삽입·폰트 경로는 미분석 |
| 현재 추천 버전 | 현대 접근성은 PS5·PS4·Switch / Vita 휴대성과 초기 +판 경험은 Vita |

근거: [COWCAT 공식 Press Kit](https://www.cowcatgames.com/presskit/sheet.php?p=xenonvalkyrie), [PlayStation Blog Vita 발표](https://blog.playstation.com/2017/12/13/roguelite-platformer-xenon-valkyrie-lands-on-ps-vita-next-week/), [GameFAQs Vita 발매 정보](https://gamefaqs.gamespot.com/vita/224347-xenon-valkyrie-plus/data).

## 스포일러 최소 시놉시스

사악한 마녀와 악마 군대가 세계를 위협하고, 플레이어는 세 명의 영웅 중 하나를 골라 달의 가장 깊은 곳까지 내려가 그 계획을 저지해야 한다.

각 런마다 지형·아이템·적 배치가 달라지고, 전투와 탐색 중 얻은 경험치로 능력치를 올리며 수많은 무기와 비밀을 찾는다. 죽으면 대부분의 진행을 잃지만 일부 영구 자원과 해금 요소가 남아 다음 도전에 영향을 준다.

## 게임 구조 / 루트 구조

- **3명의 영웅:** 시작 능력치와 고유 능력이 다른 세 캐릭터 중 하나를 선택한다.
- **절차 생성 스테이지:** 각 구역은 여러 층으로 구성되고 런마다 지형·적·아이템 배치가 바뀐다.
- **상하 이동형 플랫폼 액션:** 대체로 스테이지 상단에서 시작해 아래쪽 출구를 찾는 구조다.
- **근접 + 총기:** 검·총·수류탄을 병행하고 Vita판은 무기별 전용 버튼을 배정해 PC 원작보다 전환 조작을 간소화했다.
- **레벨업:** 적을 쓰러뜨려 경험치를 얻고 HP·공격·방어·탄약 관련 능력치를 런 안에서 성장시킨다.
- **100개 이상 아이템:** 무기·소모품·방어 관련 아이템이 랜덤으로 등장한다.
- **보스와 미니보스:** 구역 진행 중 키를 주는 미니보스와 패턴 학습이 필요한 보스가 등장한다.
- **Permadeath:** 사망하면 레벨·일반 장비·아이템 등 해당 런의 대부분을 잃는다.
- **Teamerite:** 보스 격파 등으로 얻는 일부 영구 자원은 다음 런으로 이어져 해금에 사용된다.
- **포털:** 특정 지점으로 건너뛸 수 있는 영구 해금이 있지만 장비가 따라오지 않아 실전 효율은 낮다는 비판이 있다.
- **복수 경로·엔딩:** 비밀 스테이지와 다수 엔딩, 숨겨진 보스·요소가 있다.

자료: [PlayStation Blog](https://blog.playstation.com/2017/12/13/roguelite-platformer-xenon-valkyrie-lands-on-ps-vita-next-week/), [Video Chums Vita 리뷰](https://videochums.com/review/xenon-valkyrie-plus), [Destructoid Vita 리뷰](https://www.destructoid.com/reviews/review-xenon-valkyrie/).

## 왜 발굴할 만한가

Vita판은 단순 축소 이식이 아니라 **PC 원작의 피드백을 반영해 게임플레이를 다듬은 첫 `+` 버전**이라는 의미가 있다. COWCAT은 이 판본을 위해 무기별 전용 버튼을 넣었고, GameMaker Studio 기반 게임을 Vita에서 원본 해상도 기준으로 구동해 60fps를 목표로 했다.

휴대기와 로그라이트의 짧은 런 구조도 궁합이 좋다. Destructoid와 Vita Player는 반복 도전의 중독성과 휴대 플레이 적합성을 긍정했고, Video Chums는 비밀·보스·점진적 숙련 과정을 강하게 호평했다.

다만 난도가 과도하게 높고, 절차 생성이 항상 공정하지 않으며, 작은 Vita 화면에서는 캐릭터·적·벽이 서로 뭉개져 보이는 문제가 있다. 작품 자체도 장르 최상급보다는 개성이 분명한 중소 규모 로그라이트에 가깝다.

## 장점

- Vita가 최초의 `+` 강화판이며 PC 원작 피드백을 반영한 게임플레이 개선이 들어갔다.
- 무기별 전용 버튼으로 Vita 컨트롤이 PC 원작보다 직관적으로 다듬어졌다.
- 공식 발표 기준 Vita에서 부드러운 60fps 구동을 목표로 이식됐다.
- 짧은 런과 휴대 플레이가 잘 맞아 Vita용 소형 액션게임으로 접근성이 좋다.
- 세 캐릭터·다수 경로·100개 이상 아이템·복수 엔딩·비밀 요소가 있어 반복 도전 보상이 있다.
- Video Chums는 **8.4/10**, Vita Player는 **8/10**으로 높은 평가를 줬다.
- GameFAQs의 Vita 사용자 점수는 **8.0/10·14명**으로 평론 평균보다 높다.
- 보스 패턴을 학습하고 숙련이 쌓일수록 진행이 눈에 띄게 좋아지는 구조다.
- 픽셀아트와 chiptune 사운드트랙에 대한 호평이 꾸준하다.
- PlayStation TV 호환과 이후 PS4 Cross-Buy 지원으로 당시 PlayStation 생태계 활용성이 좋았다.

## 단점

- Vita Metacritic은 **62/100·5평론**으로 평론 반응이 혼재한다.
- Cubed3는 **4/10**, Gaming Age는 **58/100**, PlayStation Country는 **6/10**으로 완성도·난도 설계를 낮게 봤다.
- 작은 Vita 화면에서 캐릭터와 적·지형이 지나치게 작고, 바쁜 픽셀아트 때문에 가독성이 떨어진다는 지적이 있다.
- 조작이 다소 미끄러워 플랫폼 가장자리에서 실수하기 쉽다.
- 절차 생성 때문에 벽 뒤에 넓은 지역이 생기거나 접근을 위해 수류탄을 낭비해야 하는 등 불공정한 상황이 발생할 수 있다.
- 회복 수단이 제한적이라 작은 실수가 런 전체를 망치기 쉽다.
- 영구 해금 무기는 즉시 지급되는 것이 아니라 이후 랜덤 상자 풀에 추가되는 방식이라 성장 보상이 약하게 느껴질 수 있다.
- 포털로 후반 구역을 건너뛰어도 충분한 장비가 제공되지 않아 실전 가치가 낮다는 비판이 있다.
- 현대에는 PS4·PS5·Xbox·Switch판까지 있어 Vita 독점성은 없다.

## 외부 평가

| 출처 | 점수 | 표본 수 | 대상 판본·비고 |
|---|---:|---:|---|
| Metacritic | **62/100** | **5평론** | PS Vita |
| Video Chums | **8.4/10** | 1편 | PS Vita·PSTV 직접 플레이 |
| Vita Player | **8/10** | 1편 | PS Vita |
| Destructoid | **6.5/10** | 1편 | PS Vita |
| PlayStation Country | **6/10** | 1편 | PS Vita |
| Gaming Age | **58/100** | 1편 | PS Vita |
| Cubed3 | **4/10** | 1편 | PS Vita |
| GameFAQs 사용자 | **8.0/10** | **14명** | PS Vita |
| MobyGames 비평 평균 | **71%** | **7평가** | PS Vita 중심 통합 비평 |

- [Metacritic Vita](https://www.metacritic.com/game/xenon-valkyrie-plus/critic-reviews/)
- [Video Chums 8.4](https://videochums.com/review/xenon-valkyrie-plus)
- [Vita Player 8/10](https://www.vitaplayer.co.uk/game-review-xenon-valkyrie-ps-vita/)
- [Destructoid 6.5](https://www.destructoid.com/?p=224849)
- [GameFAQs Vita 리뷰 집계](https://gamefaqs.gamespot.com/vita/224347-xenon-valkyrie-plus/reviews)
- [MobyGames](https://www.mobygames.com/game/99769/project-xenon-valkyrie/)

> 3.5점은 메타크리틱 62를 단순 환산한 값이 아니다. 평론은 거칠게 갈리지만 Vita Player·Video Chums·사용자 평가는 분명한 장르적 재미를 확인한다. 휴대성과 반복 도전의 강점이 있으나, 가독성·미끄러운 조작·랜덤 생성의 불공정함·과도한 난도가 4.0을 막는다.

## 플레이타임

Vita 전용으로 신뢰할 만한 대형 플레이타임 표본은 이번 조사에서 확보하지 못했다.

- 동일한 `+`판인 PS4 GameFAQs 통계는 **10명 평균 10.4시간**.
- PS4 표본에서는 약 12시간 응답이 50%, 약 4시간 20%, 약 8시간 20%, 약 20시간 10%다.
- 로그라이트 특성상 첫 엔딩 시간보다 비밀·다수 엔딩·보스·플래티넘 회수 시간이 훨씬 길다.
- Trophy Guide도 모든 트로피는 단순 공략만으로 해결되지 않고 반복 숙련이 필요하다고 설명한다.
- 한글화 검수는 NPC·아이템·장비·엔딩·비밀 구역·메뉴까지 봐야 하지만 장편 VN보다 텍스트 비중은 낮다.

자료: [GameFAQs PS4 동일 +판 통계](https://gamefaqs.gamespot.com/ps4/231691-xenon-valkyrie-plus/stats), [Video Chums Trophy Guide](https://videochums.com/article/xenon-valkyrie-plus-steam-achievements-trophies-walkthrough).

## 한국어화 상태

- 공식 PS Vita 한국어판: **2026-09-21 기준 공개적으로 확인되지 않음**.
- 공개 PS Vita 유저 한국어 패치: **2026-09-21 기준 공개적으로 확인되지 않음**.
- Vita 공식 언어: 영어·프랑스어·스페인어·독일어·이탈리아어.
- Steam 원작 `Xenon Valkyrie`: **한국어 미지원**.
- 현재 한국 PlayStation Store 계열의 PS4·PS5 `Xenon Valkyrie+`도 **영어판**으로 표시된다.
- Nintendo Switch판도 공식 한국어 지원 근거를 이번 조사에서 확인하지 못했다.
- 국내 통용 한글 표기가 뚜렷하지 않아 자연스러운 음역 **제논 발키리+**를 사용한다.

자료: [PlayStation Blog 지원 언어](https://blog.playstation.com/2017/12/13/roguelite-platformer-xenon-valkyrie-lands-on-ps-vita-next-week/), [Steam 한국어 페이지](https://store.steampowered.com/app/573780/?l=koreana), [한국 PSPrices](https://psprices.com/region-kr/collection/most-wanted-games?lang=ko).

## 원작·이식·확장판 관계

- **Xenon Valkyrie / PC / 2017-02-03:** Diabolical Mind의 원작.
- **Xenon Valkyrie+ / PS Vita / 2017-12-19:** COWCAT이 원작을 이식하며 피드백 기반 개선을 적용한 첫 `+` 강화판.
- **PS4 / 2018-02-20:** Vita `+` 계열을 거치며 홈콘솔로 확대. Vita와 Cross-Buy 지원.
- **Xbox One / 2018-02-21:** `+`판 이식.
- **Nintendo Switch / 2019-01-01:** 휴대·거치 후발판.
- **PS5 / 2022-05-27:** 최신 PlayStation 네이티브판.
- **Asia PlayStation / 2020:** Eastasiasoft를 통한 아시아 지역 배포 기록 존재.
- 후속·연계작으로 같은 개발사의 `Riddled Corpses EX`, `Demon's Tier`가 ‘Diabolical Trilogy’ 계열로 묶인다.

자료: [COWCAT Press Kit](https://www.cowcatgames.com/presskit/sheet.php?p=xenonvalkyrie), [MobyGames](https://www.mobygames.com/game/99769/project-xenon-valkyrie/).

## 플랫폼별 추가·삭제 콘텐츠

| 판본 | 확인된 내용 |
|---|---|
| PC 원작 | 2017 초기판 / 기존 무기 전환 방식 |
| PS Vita + | 원작 피드백 반영 / 무기별 전용 버튼 / Vita·PSTV / 60fps 목표 / 첫 강화판 |
| PS4 + | Vita판과 유사한 + 콘텐츠 / CRT 필터 추가 / Vita Cross-Buy |
| Xbox One + | +판 홈콘솔 이식 |
| Switch + | +판 휴대·거치 이식 |
| PS5 + | 최신 PlayStation 네이티브판 / 현대 플랫폼 접근성 |

## 현재 추천 버전

**지금 처음 플레이한다면 PS5·PS4 또는 Switch판이 가장 편하다.** 같은 `+` 계열 개선판을 현대 하드웨어에서 플레이할 수 있고, 한국 PlayStation Store에서도 영어판이 판매된다.

**Vita판은 휴대기에서 60fps 로그라이트를 즐기려는 목적과 ‘+` 강화판의 출발점이라는 보존 가치**가 있다. 다만 Switch가 휴대 대안을 제공하고 후발 홈콘솔판도 많아 Vita만의 독점 콘텐츠는 크지 않다.

## 한글화 후보 평가

### 한글화 가치

- 작품성: **중상 / 평가 편차 큼**.
- 한국어 접근성: 공식 한국어·공개 Vita 한국어 패치 확인 못함.
- 영어 접근성: 매우 좋음. Vita를 포함한 다수 플랫폼에서 공식 영어 제공.
- 텍스트 의존도: 액션 중심이라 장편 RPG·VN보다 낮은 편.
- Vita 독자 가치: 첫 `+` 강화판이라는 역사적 의미는 있으나 후발판이 동일 핵심 개선을 계승.
- 후발 대안: PS4·PS5·Xbox·Switch가 존재.
- 한글화 우선도: **C**.
- 판단 근거: 한국어가 없는 점은 번역 가치가 있지만, 공식 영어가 충분하고 텍스트 비중이 낮으며 현대 후발판이 많아 Vita 전용 프로젝트 우선순위는 낮다.

### 기술 난이도

| 항목 | 평가 | 근거 |
|---|---|---|
| 예상 텍스트량 | 적음~중간 / 정확한 행 수 미확인 | NPC·아이템·장비·엔딩·메뉴 중심의 액션게임 |
| 게임 엔진 | **GameMaker Studio 확인** | COWCAT가 Vita 포팅 과정에서 공식 명시 |
| 텍스트 추출 | 미확인 | Vita판 실제 문자열·컨테이너 분석 자료 미확인 |
| 텍스트 재삽입 | 미확인 | 길이 제한·패킹 방식 미분석 |
| 폰트 작업 | 미확인 | 한글 글리프·폰트 위치 미분석 |
| UI 이미지 / 아틀라스 | 미확인 | 메뉴·아이콘·이미지 텍스트 구조 미분석 |
| 영상 자막 | 미확인 | 영상 콘텐츠와 자막 구조 미분석 |
| 제어문자 / 스크립트 구조 | 미확인 | GameMaker 사용 사실만으로 실제 데이터 구조를 추정하지 않음 |
| 실행 파일 수정 | 미확인 | 한글 렌더링에 EBOOT 수정이 필요한지 미확인 |
| 패치 배포 방식 | 미확인 | Vita 번역용 rePatch 사례 확인 못함 |
| 실기·에뮬 검수 | 부분 확인 | PCSE-01191·PCSB-01202 및 v1.01 업데이트 식별 자료 존재 / 한국어 수정본 검증은 없음 |

### 예상 한글화 난이도

**미확인.**

GameMaker Studio 사용과 Vita 제품 코드·업데이트는 확인됐지만, 이것만으로 번역 파일 위치나 폰트 구조를 추정하지 않는다. 실제 게임 파일 또는 신뢰할 만한 Xenon Valkyrie+ Vita 번역 분석이 확보되기 전에는 기술 난이도를 단정할 수 없다.

## 대표 스크린샷

> 저작권 이미지는 저장소에 복제 업로드하지 않는다. 아래는 실제 게임 화면이며 출처·판본을 구분한다.

1. **PS Vita PlayStation Store 실제 게임 화면 1**  
   [MobyGames - PlayStation Store Screenshot 1 / 960×544](https://www.mobygames.com/game/99769/project-xenon-valkyrie/promo/group-32047/image-300509/)

2. **PS Vita PlayStation Store 실제 게임 화면 5**  
   [MobyGames - PlayStation Store Screenshot 5 / 960×544](https://www.mobygames.com/game/99769/project-xenon-valkyrie/promo/group-32047/image-300513/)

3. **COWCAT 공식 PS Vita 스크린샷 묶음**  
   [공식 Press Kit의 PlayStation Vita screenshots 섹션](https://www.cowcatgames.com/presskit/sheet.php?p=xenonvalkyrie)

## 한줄평

**짧게 들고 죽고 다시 뛰기엔 Vita와 찰떡인 매운맛 로그라이트지만, 작은 화면과 랜덤 생성까지 한꺼번에 적으로 돌면 실력보다 혈압이 먼저 성장하는 작품.**

## 최종 판정

**PS Vita / ⭐⭐⭐½☆ 3.5/5 / 🟢 후보 / 한글화 우선도 C / 기술 난이도 미확인.**

등록선은 통과한다. Vita 평론 평균 62는 낮지만 Video Chums 8.4, Vita Player 8, GameFAQs 사용자 8.0/10처럼 실제 휴대 플레이의 장점을 높게 본 평가도 분명하다. 비밀·보스·숙련 기반 반복성은 발굴 가치가 있으나, 작은 화면 가독성·조작의 미끄러움·불공정한 랜덤 생성·과도한 난도 때문에 4.0까지 올릴 수는 없다.

C급인 이유는 **한국어 미지원에도 불구하고 공식 영어가 이미 Vita에서 제공되고, 동일한 + 강화판이 PS4·PS5·Xbox·Switch로 널리 존재하며, 텍스트 의존도도 낮기 때문**이다. Vita판 신규 한글화의 기회비용이 높은 편이다.

## 참고 자료

- [COWCAT 공식 Press Kit](https://www.cowcatgames.com/presskit/sheet.php?p=xenonvalkyrie)
- [PlayStation Blog Vita 개발·이식 소개](https://blog.playstation.com/2017/12/13/roguelite-platformer-xenon-valkyrie-lands-on-ps-vita-next-week/)
- [GameFAQs Vita 발매·제품 코드](https://gamefaqs.gamespot.com/vita/224347-xenon-valkyrie-plus/data)
- [Metacritic Vita 62/100](https://www.metacritic.com/game/xenon-valkyrie-plus/critic-reviews/)
- [Video Chums Vita 8.4/10](https://videochums.com/review/xenon-valkyrie-plus)
- [Vita Player Vita 8/10](https://www.vitaplayer.co.uk/game-review-xenon-valkyrie-ps-vita/)
- [Destructoid Vita 6.5/10](https://www.destructoid.com/?p=224849)
- [GameFAQs Vita 사용자·평론 집계](https://gamefaqs.gamespot.com/vita/224347-xenon-valkyrie-plus/reviews)
- [MobyGames Project Xenon Valkyrie+](https://www.mobygames.com/game/99769/project-xenon-valkyrie/)
- [Steam PC 원작·언어](https://store.steampowered.com/app/573780/Xenon_Valkyrie/)
- [Nintendo Switch 공식](https://www.nintendo.com/us/store/products/xenon-valkyrie-plus-switch/)
- [PlayStation PS4·PS5 공식](https://store.playstation.com/en-us/product/UP1778-PPSA06872_00-XENONPS500000000/)
