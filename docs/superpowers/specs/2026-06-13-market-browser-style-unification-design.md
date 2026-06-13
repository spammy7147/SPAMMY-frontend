# 마켓 브라우저 스타일 통일성 개선 설계서

## 1. 개요
현재 마켓 브라우저(Market Browser) 왼쪽의 카테고리 트리에서 항목들의 폰트 굵기(font-weight)와 색상의 불투명도가 일관성 없이 중구난방으로 출력되는 문제가 있습니다.
이를 개선하여 모든 카테고리와 실제 아이템 항목의 텍스트 스타일을 선명한 기본 색상(`text-foreground`)과 일반 굵기(`font-normal`)로 일치시키고, 오직 들여쓰기(indentation)를 통해서만 카테고리 계층 구조를 직관적으로 표현하도록 합니다.

---

## 2. 변경 대상 및 범위

### 2.1 프론트엔드 컴포넌트 스타일 수정
- `MarketBrowser.jsx` 파일의 `MarketGroupTree` 컴포넌트 내부의 두 가지 버튼 스타일을 수정합니다.
  1. **카테고리(그룹) 버튼**: 3단계 카테고리 판단 조건(`group.hasTypes`)에 따른 스타일 분기 로직을 완전히 제거하고, `font-normal text-foreground`로 통일합니다.
  2. **실제 아이템(Type) 버튼**: `text-foreground-dim` 색상을 지우고 `text-foreground`를 적용하여 텍스트의 가시성(Contrast)을 확보합니다.

---

## 3. 세부 설계 및 의사코드

### 3.1 `MarketBrowser.jsx` 수정

#### 3.1.1 카테고리(그룹) 버튼 스타일 수정
```javascript
// AS-IS
className={cn(
    "w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors text-foreground text-left",
    group.hasTypes ? "text-foreground-dim font-normal" : ""
)}

// TO-BE
className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal hover:bg-foreground/5 rounded-md transition-colors text-foreground text-left"
```

#### 3.1.2 실제 아이템(Type) 버튼 스타일 수정
```javascript
// AS-IS
className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal text-foreground-dim hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors text-left"

// TO-BE
className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal text-foreground hover:bg-foreground/5 rounded-md transition-colors text-left"
```

---

## 4. 검증 시나리오

1. **시각적 스타일 검증 (가시성 확보)**
   - 마켓 브라우저를 열었을 때, 모든 카테고리명과 실제 아이템 명칭이 흐리지 않고 선명한 하얀색(또는 밝은 모드일 경우 검은색)의 일정한 색상(`text-foreground`)으로 출력되는지 확인합니다.
   - 글자 굵기가 모두 얇은 굵기(`font-normal`)로 통일되어 일관성이 느껴지는지 확인합니다.
2. **계층 구조 정상 작동 검증**
   - 카테고리를 펼치고 접을 때, 계층별 들여쓰기(`pl-4` 패딩)가 유지되어 계층 구분이 여전히 명확하게 되는지 확인합니다.
