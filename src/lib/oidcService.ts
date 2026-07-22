import { UserManager, type UserManagerSettings, type User } from 'oidc-client-ts'
import { env } from './env'

const settings: UserManagerSettings = {
  authority: env.oidcAuthority,
  client_id: env.oidcClientId,
  redirect_uri: location.origin + '/callback',
  scope: 'openid profile email',
  response_type: 'code',
}

const userManager = new UserManager(settings)

export async function signinRedirect(): Promise<void> {
  await userManager.signinRedirect({ prompt: 'select_account' })
}

export async function signinRedirectCallback(): Promise<User> {
  return userManager.signinRedirectCallback()
}
