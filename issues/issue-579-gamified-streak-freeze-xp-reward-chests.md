---
title: '[FEAT]: Gamified Streak Freeze Inventory, XP Reward Chests & Unlockable Avatar Cosmetics'
labels: 'enhancement, gamification, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Habit building requires both positive reinforcement and forgiveness mechanisms. When students inevitably face emergencies or travel and break a 30-day streak, the abrupt loss of progress can be demotivating.

This feature introduces a **Gamified PrepCoin Economy, Streak Freeze Inventory, and XP Mystery Chest Unboxing System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Gamification & Rewards Engine (`backend/services/gamificationService.js`)**:
   - Awards PrepCoins upon completing daily goals, scoring $>80%$ on quizzes, and reviewing due flashcards.
   - Manages user inventory (Streak Freezes, 2x XP Boosters, Custom Avatar Frames).
   - Automated Streak Maintenance Cron: When a student misses a calendar day, consumes 1 available Streak Freeze instead of resetting the streak counter to zero.
2. **REST Endpoints (`backend/controllers/gamificationController.js`)**:
   - `GET /api/gamification/inventory` - Retrieves user balances, active freezes, and owned cosmetics.
   - `POST /api/gamification/shop/buy` - Purchases inventory items using earned PrepCoins.
   - `POST /api/gamification/chest/open` - Unlocks a mystery chest and returns randomized XP or cosmetic loot.

### Frontend Architecture
1. **Rewards & Shop View (`frontend/src/components/gamification/RewardsShop.jsx`)**:
   - Storefront displaying item prices, current PrepCoin balance, and active booster timers.
2. **3D Mystery Chest Unboxing Animation (`frontend/src/components/gamification/ChestUnboxingModal.jsx`)**:
   - CSS 3D transform chest-shake and gold sparkle particle animation upon opening rewards.

---

## Acceptance Criteria
- [ ] Streak Freeze automatically preserves a student's streak if they miss a single day, provided they hold a freeze in inventory.
- [ ] PrepCoins are earned reliably through quizzes and flashcards without exploit vulnerabilities.
- [ ] Chest opening animations render smoothly with confetti and particle effects.
- [ ] Unit tests for streak freeze auto-consumption and inventory transaction safety.
