# 마켓 브라우저 스타일 통일성 개선 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마켓 브라우저 왼쪽 카테고리 트리의 텍스트 가시성과 굵기를 일관되게 정돈합니다.

**Architecture:** 
1. `MarketBrowser.jsx` 파일의 `MarketGroupTree` 컴포넌트 내부에서 카테고리와 실제 아이템의 스타일을 모두 일반 굵기(`font-normal`)와 기본 색상(`text-foreground`)으로 통일합니다.
2. 들여쓰기(`pl-4`) 구조만으로 계층을 드러냅니다.

**Tech Stack:** React, Tailwind CSS, Javascript

---

### Task 1: 카테고리(그룹) 버튼 스타일 수정

**Files:**
- Modify: `src/components/market/MarketBrowser.jsx:19-25`

- [ ] **Step 1: MarketBrowser.jsx의 카테고리 버튼 스타일 클래스 변경**

  `src/components/market/MarketBrowser.jsx` 파일의 `MarketGroupTree` 컴포넌트 내부의 카테고리 버튼 엘리먼트를 다음과 같이 수정합니다.

  ```javascript
  // AS-IS (Line 19-25 부근)
  <button 
      onClick={handleToggle}
      className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors text-foreground text-left",
          group.hasTypes ? "text-foreground-dim font-normal" : ""
      )}
  >

  // TO-BE
  <button 
      onClick={handleToggle}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal hover:bg-foreground/5 rounded-md transition-colors text-foreground text-left"
  >
  ```

- [ ] **Step 2: 작업 커밋**

  ```bash
  git add src/components/market/MarketBrowser.jsx
  git commit -m "style(market): unify category button to font-normal and text-foreground"
  ```

---

### Task 2: 실제 아이템(Type) 버튼 스타일 수정

**Files:**
- Modify: `src/components/market/MarketBrowser.jsx:33-37`

- [ ] **Step 1: MarketBrowser.jsx의 실제 아이템 버튼 스타일 클래스 변경**

  `src/components/market/MarketBrowser.jsx`의 `MarketGroupTree` 컴포넌트 내부의 실제 아이템 버튼 엘리먼트를 다음과 같이 수정합니다.

  ```javascript
  // AS-IS (Line 33-37 부근)
  <button 
      key={`type-${child.id}`}
      onClick={() => onSelectType(child, group.nameEn || group.nameKo)}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal text-foreground-dim hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors text-left"
  >

  // TO-BE
  <button 
      key={`type-${child.id}`}
      onClick={() => onSelectType(child, group.nameEn || group.nameKo)}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal text-foreground hover:bg-foreground/5 rounded-md transition-colors text-left"
  >
  ```

- [ ] **Step 2: 작업 커밋**

  ```bash
  git add src/components/market/MarketBrowser.jsx
  git commit -m "style(market): unify type item button to text-foreground"
  ```

---

### Task 3: 최종 동작 확인

**Files:**
- None (로컬 화면 구동 테스트)

- [ ] **Step 1: 프론트엔드 로컬 서버 구동**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: 화면 스타일 확인**

  - 마켓 브라우저 왼쪽 카테고리 트리에서 3단계(최종) 카테고리와 그 아래의 실제 아이템 명칭이 모두 동일하게 진한 하얀색(또는 검은색)의 일정한 색상(`text-foreground`) 및 얇은 굵기(`font-normal`)로 표기되는지 눈으로 확인합니다.
