# 📋 설계서: 지갑 저널(Wallet Journal) 음수 금액 포맷팅 단위 표시 오류 수정

## 📌 1. 개요
* **문제 상황**: 지갑 저널 화면(`Wallet Journal`)에서 양수(+) 금액은 `K`, `M`, `B`와 같은 단위가 잘 표시되지만, 음수(-) 금액(사용한 금액 등)은 단위가 생략된 채 원본 금액이 표시되는 오류가 발생함.
* **원인**: 포맷터 함수인 `formatISK`가 양수를 기준으로만 조건 비교(`amount >= 1_000` 등)를 수행하여, 음수가 들어오면 조건에 걸리지 않고 원본 포맷팅만 수행됨.
* **목표**: 금액의 절대값 기준으로 단위를 식별하고, 음수 부호(`-`)를 유지하는 형태로 구현하여 음수에서도 단위 포맷팅이 작동하도록 수정함.

---

## 🛠️ 2. 상세 설계

### 2.1 대상 파일
* [utils.js](file:///Users/spammy/playground/SPAMMY/SPAMMY-frontend/src/lib/utils.js)

### 2.2 코드 변경 계획
`formatISK` 함수 내부에서 절대값(`Math.abs`)과 음수 여부(`amount < 0`)를 사전에 판단하도록 로직을 변경합니다.

```javascript
export function formatISK(amount, abbreviate = true) {
    if (!amount) return '0.00'
    
    if (abbreviate) {
        const isNegative = amount < 0;
        const absAmount = Math.abs(amount);
        const sign = isNegative ? '-' : '';
        
        if (absAmount >= 1_000_000_000) return sign + (absAmount / 1_000_000_000).toFixed(2) + ' B'
        if (absAmount >= 1_000_000) return sign + (absAmount / 1_000_000).toFixed(2) + ' M'
        if (absAmount >= 1_000) return sign + (absAmount / 1_000).toFixed(2) + ' K'
        return sign + absAmount.toFixed(2)
    } else {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
```

---

## 🧪 3. 검증 계획 (Verification Plan)

### 3.1 임시 검증 스크립트 작성
* 경로: `/Users/spammy/playground/SPAMMY/SPAMMY-frontend/src/lib/verify_format_isk.js`
* 검증 시나리오:
  1. `500,000,000` ➡️ `500.00 M`
  2. `-500,000,000` ➡️ `-500.00 M`
  3. `12,345` ➡️ `12.35 K` (반올림 검증)
  4. `-12,345` ➡️ `-12.35 K` (음수 반올림 검증)
  5. `0` ➡️ `0.00`
  6. `null` / `undefined` ➡️ `0.00`
* 실행 방식: `node` 명령어로 직접 스크립트 실행 후 `console.assert`로 검증.
