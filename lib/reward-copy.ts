/**
 * The one line every wallet pass shows about the reward — Apple's
 * secondaryField, Google's textModulesData, and the in-app WalletPassCard
 * preview all use this, so a copy change never drifts between them.
 */
export function rewardCopy(remaining: number): string {
  return remaining > 0
    ? `კიდევ ${remaining} ვიზიტი და საჩუქარი შენია`
    : 'საჩუქარი მზადაა, ახლავე წაიღე'
}
