# Wallet Journal Negative Amount Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix formatting of negative amount/spent amount in wallet journal by ensuring K, M, B abbreviations are displayed properly.

**Architecture:** Modify `formatISK` in `src/lib/utils.js` to process absolute value of the amount for abbreviating and re-apply the minus sign if the original value was negative.

**Tech Stack:** JavaScript, Node.js (for test runner verification)

---

### Task 1: Create Verification Script (Failing Test)

**Files:**
- Create: `SPAMMY-frontend/src/lib/verify_format_isk.js`

- [x] **Step 1: Write the failing test**

```javascript
import { formatISK } from './utils.js';
import assert from 'assert';

try {
    // 1. Positive standard case
    assert.strictEqual(formatISK(500000000), '500.00 M');
    
    // 2. Negative case (currently failing, expecting K/M/B abbreviation)
    assert.strictEqual(formatISK(-500000000), '-500.00 M');
    
    // 3. Positive K case
    assert.strictEqual(formatISK(12345), '12.35 K');
    
    // 4. Negative K case
    assert.strictEqual(formatISK(-12345), '-12.35 K');
    
    // 5. Zero case
    assert.strictEqual(formatISK(0), '0.00');

    console.log("✅ All tests passed successfully!");
} catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `node SPAMMY-frontend/src/lib/verify_format_isk.js`
Expected output:
```
❌ Test failed: Expected values to be strictly equal:
'-500000000.00' !== '-500.00 M'
```

---

### Task 2: Implement and Verify Fix

**Files:**
- Modify: `SPAMMY-frontend/src/lib/utils.js`

- [x] **Step 3: Write minimal implementation**

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

- [x] **Step 4: Run test to verify it passes**

Run: `node SPAMMY-frontend/src/lib/verify_format_isk.js`
Expected output:
```
✅ All tests passed successfully!
```

---

### Task 3: Cleanup and Commit

**Files:**
- Delete: `SPAMMY-frontend/src/lib/verify_format_isk.js`
- Modify: `SPAMMY-frontend/src/lib/utils.js`

- [x] **Step 5: Clean up and Commit**

Remove the temporary test script:
Run: `rm SPAMMY-frontend/src/lib/verify_format_isk.js`

Commit formatting fix:
Run:
```bash
git add SPAMMY-frontend/src/lib/utils.js docs/superpowers/plans/2026-06-07-wallet-journal-negative-amount-format-plan.md
git commit -m "fix(utils): Format negative ISK values with abbreviations" -m "Update formatISK function to support negative values by formatting absolute value and restoring sign."
```
