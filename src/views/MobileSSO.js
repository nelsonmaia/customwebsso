import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../config";
import auth0 from 'auth0-js';

const { seamlessLoginPageClientId, domain } = getConfig();
const ssoConnection = "m2wv-mobilesso-db"
const host = "https://spa.yusasaki0.app"
const webAuth = new auth0.WebAuth({
  domain,
  clientID: seamlessLoginPageClientId,
  redirectUri: `${host}/mobilesso?sso_completed=true`,
  responseType: 'id_token'
});

const searchParams = new URLSearchParams(document.location.search)
const ssoCompleted = Boolean(searchParams.get("sso_completed"))
const DEBUG = Boolean(searchParams.get("debug"))

window.callbackFromMobileApp = function (json) {
  console.log("Message received:", json)
  try {
    const user_id = json.userId;
    const accessToken = json.accessToken;
    webAuth.login({
      realm: ssoConnection,
      email: `${user_id}@user.id`,
      password: accessToken
    });
  } catch (e) {
    console.log(e)
  }
}

const testSSO = (e, { accessToken, userId }) => {
  e.preventDefault()
  window.callbackFromMobileApp({ accessToken, userId })
}

window.webToNativeHelper = {
  isWebViewContext: () => !!window.webkit || !!window.flutterApp || !!window.ReactNativeWebView,
  postMessage: (message) => (
    window.webkit?.messageHandlers?.nativeBridge?.postMessage(message) || 
    // window.flutterApp?.postMessage(message) || 
    window.flutterApp?.postMessage(JSON.stringify(message)) || 
    window.ReactNativeWebView?.postMessage(JSON.stringify(message))
  )
};

export const MobileSSOComponent = () => {

  const { loginWithRedirect } = useAuth0();
  const [state, setState] = useState({
    accessToken: "", userId: ""
  })

  if (!ssoCompleted && DEBUG) {
    return (
      <div>
        <hr />
        DEBUG<br />
        Access Token: <input value={state.accessToken} width={500} onChange={e => setState({ ...state, accessToken: e.target.value })} />
        User ID: <input value={state.userId} width={500} onChange={e => setState({ ...state, userId: e.target.value })} />
        <button onClick={e => testSSO(e, state)}>Test SSO</button>
      </div>
    )
  }

  if (ssoCompleted) {
    loginWithRedirect({
      authorizationParams: {
        connection: ssoConnection,
        redirect_uri: `${host}/profile`
      }
    })
    return (<div>セッション確立されました。メインウェブサイトへリダイレクトしています。。。</div>);
  }

  // eslint-disable-next-line no-undef
  if (!window.webToNativeHelper.isWebViewContext()) { return (<div>このページはモバイルアプリケーションからのみアクセスできます</div>) }

  window.webToNativeHelper.postMessage({ "action": "mobilesso" });
  return (<div>Auth0とセッションを確立しようとしています。。。</div>);
};

export default MobileSSOComponent; 
