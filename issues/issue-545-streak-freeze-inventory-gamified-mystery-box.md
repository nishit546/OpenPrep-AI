---
title: '[FEAT]: Dynamic Streak Freeze Inventory & Gamified Mystery Box Rewards Engine'
labels: 'enhancement, gamification, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Study streaks are one of the strongest motivators for daily revision. However, unexpected emergencies or illness can cause students to break a 50-day streak, leading to severe demotivation.

This feature introduces a **Gamified Streak Freeze Inventory, XP Reward Shop & Daily Mystery Box System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Gamification & Rewards Engine (`backend/services/gamificationRewardService.js`)**:
   - Automatic streak freeze application when a student misses their daily study goal, provided they have available freeze tokens in their inventory.
   - Mystery Loot Box RNG algorithm awarding XP boosters, exclusive avatar badges, and streak repair tokens upon reaching 7, 30, and 100-day milestones.
2. **Database Schema Enhancements**:
   - `UserInventory` table tracking items (streak freeze tokens, badge frames, XP multipliers).
3. **REST Endpoints**:
   - `POST /api/rewards/mystery-box/open` - Unlocks daily milestone mystery box and credits reward.
   - `POST /api/rewards/shop/purchase` - Uses student XP to buy streak freeze tokens.
   - `GET /api/rewards/inventory` - Fetches student items and active power-ups.

### Frontend Architecture
1. **Rewards & Item Shop Modal (`frontend/src/components/gamification/ItemShopModal.jsx`)**:
   - Interactive card grid showing purchasable perks with XP price tags.
2. **Mystery Box Unboxing Animation (`frontend/src/components/gamification/MysteryBoxModal.jsx`)**:
   - 3D / CSS animated treasure chest opening effect with confetti particle burst upon unlocking items.

---

## Acceptance Criteria
- [ ] Streak freeze automatically activates when a daily study goal is missed if student owns a freeze token.
- [ ] Students can purchase streak freezes and cosmetics using earned XP.
- [ ] Opening mystery boxes displays engaging unlock animations and updates user inventory accurately.
