import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { IpcChannel } from '../../ipc/contract'
import type { AccountDto, AuthStatusDto, ResultDto, SyncReportDto } from '../../ipc/contract'
import { isDomainError } from '../../core/errors'
import type { BootContext } from './context'

export function registerAccountHandlers(ctx: BootContext): void {
  ipcMain.handle(IpcChannel.getAuthStatus, () => ctx.authStatus())
  ipcMain.handle(IpcChannel.importClientSecret, (_event, json: unknown): ResultDto<AuthStatusDto> => {
    try {
      ctx.authFlow.importClientSecret(String(json))
      return { ok: true, value: ctx.authStatus() }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })
  ipcMain.handle(IpcChannel.connectGoogle, async (): Promise<ResultDto<AuthStatusDto>> => {
    try {
      await ctx.authFlow.connect()
      ctx.authProvider.invalidate()
      // The primary account needs its accounts row too — every other write to
      // account_channels has an FK on it. A nice label is best-effort.
      let label = 'My account'
      try {
        const channel = await ctx.apiClient.getOwnChannel()
        if (channel !== null) label = channel.title
      } catch {
        // keep the placeholder — not worth failing the connection over
      }
      ctx.syncRepository.addAccount(ctx.primaryAccountId(), label, ctx.clock.now().toISOString())
      // The in-memory stack was built with the placeholder label before this
      // connection happened (or on a prior run) — without this, the sidebar
      // keeps showing "My account" until the next app restart even though
      // the real channel title is already persisted.
      const primaryStack = ctx.accountStacks.get(ctx.primaryAccountId())
      if (primaryStack) primaryStack.label = label
      void ctx.runRefresh('manual')
      return { ok: true, value: ctx.authStatus() }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })
  ipcMain.handle(IpcChannel.signOut, async () => {
    await ctx.authFlow.signOut()
    ctx.authProvider.invalidate()
    return ctx.authStatus()
  })
  ipcMain.handle(IpcChannel.requestWriteScope, async (): Promise<ResultDto<void>> => {
    try {
      await ctx.authFlow.requestWriteScope()
      ctx.authProvider.invalidate()
      return { ok: true, value: undefined }
    } catch (error) {
      const kind = isDomainError(error) ? error.kind : 'internal'
      return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
    }
  })

  // Additional-account management. The primary account above is
  // untouched by any of this — Settings and the first-run wizard keep
  // working the same.
  ipcMain.handle(IpcChannel.listAccounts, (): AccountDto[] =>
    [...ctx.accountStacks.values()].map(ctx.toAccountDto)
  )
  ipcMain.handle(
    IpcChannel.startAddAccount,
    (): { accountId: string; isFirstAccount: boolean } => {
      const isFirstAccount = ctx.accountStacks.size === 0
      const accountId = randomUUID()
      ctx.pendingAccountStacks.set(accountId, ctx.buildAccountStack(accountId, 'New account'))
      return { accountId, isFirstAccount }
    }
  )
  ipcMain.handle(
    IpcChannel.connectAccount,
    async (_event, accountId: unknown): Promise<ResultDto<AccountDto>> => {
      const id = typeof accountId === 'string' ? accountId : ''
      const stack = ctx.pendingAccountStacks.get(id) ?? ctx.accountStacks.get(id)
      if (stack === undefined) {
        return { ok: false, errorKind: 'not-found', message: 'unknown account' }
      }
      try {
        await stack.authFlow.connect()
        stack.authProvider.invalidate()
        // A nice label beats the raw id — best-effort, never blocks connecting.
        try {
          const channel = await stack.apiClient.getOwnChannel()
          if (channel !== null) stack.label = channel.title
        } catch {
          // keep the placeholder label — not worth failing the connection over
        }
        const now = ctx.clock.now().toISOString()
        ctx.syncRepository.addAccount(stack.accountId, stack.label, now)
        ctx.accountStacks.set(stack.accountId, stack)
        ctx.pendingAccountStacks.delete(stack.accountId)
        void ctx.runRefresh('manual', stack.accountId)
        return { ok: true, value: ctx.toAccountDto(stack) }
      } catch (error) {
        const kind = isDomainError(error) ? error.kind : 'internal'
        return { ok: false, errorKind: kind, message: String((error as Error).message ?? error) }
      }
    }
  )
  ipcMain.handle(IpcChannel.removeAccount, async (_event, accountId: unknown): Promise<void> => {
    const id = typeof accountId === 'string' ? accountId : ''
    // The primary account signs out via Settings (unchanged) — removing it
    // here would strand the first-run wizard/Settings' Connection section,
    // which always assume it exists.
    if (id === ctx.primaryAccountId()) throw new Error('cannot remove the primary account here')
    const stack = ctx.accountStacks.get(id)
    if (stack === undefined) return
    await stack.authFlow.signOut()
    ctx.syncRepository.removeAccount(id)
    ctx.accountStacks.delete(id)
  })
  ipcMain.handle(
    IpcChannel.syncAccountNow,
    async (_event, accountId: unknown): Promise<ResultDto<SyncReportDto>> => {
      const id = typeof accountId === 'string' ? accountId : ''
      if (!ctx.accountStacks.has(id)) {
        return { ok: false, errorKind: 'not-found', message: 'unknown account' }
      }
      return ctx.runRefresh('manual', id)
    }
  )
}
