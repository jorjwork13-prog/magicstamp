/**
 * Single on/off switch for the whole Apple Wallet push feature (Phase 2).
 * While this is false:
 *   - generated passes carry no webServiceURL/authenticationToken, so iOS
 *     never even attempts to register a device for updates;
 *   - the webservice routes still exist (Apple could theoretically call an
 *     old pass's URL) but registration/notify become no-ops;
 *   - the scan flow never calls sendPassUpdatePush.
 * Flip WALLET_APNS_PUSH_ENABLED=true only after this PR has been reviewed
 * and the migration has actually been applied.
 */
export function isWalletPushEnabled(): boolean {
  return process.env.WALLET_APNS_PUSH_ENABLED === 'true'
}
