// Authenticate with Genesys Cloud
function authenticate(client, pcEnvironment, state) {
    // Allow targeting a different environment when host app is running locally
    const platformEnvironment = pcEnvironment === 'localhost' ? 'apne2.pure.cloud' : pcEnvironment;
    /*
    * Note: To use this app in your own org, you will need to create your own OAuth2 Client(s)
    * in your Genesys Cloud org.  After creating the Implicit grant client, map the client id(s) to
    * the specified region key(s) in the object below, deploy the page, and configure an app to point to that URL.
    */
    const pcOAuthClientIds = {'apne2.pure.cloud': '4aa7b371-9072-4f3c-8abe-abedd4a0619a'};
    const clientId = pcOAuthClientIds[platformEnvironment];
    if (!clientId) {
        const defaultErr = platformEnvironment + ':'+ clientId + '1: Unknown/Unsupported Genesys Cloud Environment';
        const localErr = `
            The host app is running locally and the target platform client environment was mapped to '${platformEnvironment}'.
            Ensure that you have an oauth client specified for this environment.
        `;
        return Promise.reject(new Error(pcEnvironment === 'localhost' ? localErr : defaultErr));
    }

    client.setEnvironment(platformEnvironment);
    client.setPersistSettings(true);

    const { origin, protocol, host, pathname } = window.location;
    const redirectUrl = (origin || `${protocol}//${host}`) + pathname;

    return client.loginImplicitGrant(clientId, redirectUrl, { state })
        .then(data => {
            window.history.replaceState(null, '', `${pathname}?${data.state}`);
        });
}

function extractParams(paramStr) {
    let result = {};

    if (paramStr) {
        let params = paramStr.split('&');
        params.forEach(function(currParam) {
          if (currParam) {
              let paramTokens = currParam.split('=');
              let paramName = paramTokens[0];
              let paramValue = paramTokens[1];
              if (paramName) {
                  paramName = decodeURIComponent(paramName);
                  paramValue = paramValue ? decodeURIComponent(paramValue) : null;

                  if (!result.hasOwnProperty(paramName)) {
                      result[paramName] = paramValue;
                  } else if (Array.isArray(result[paramName])) {
                      result[paramName].push(paramValue);
                  } else {
                      result[paramName] = [result[paramName], paramValue];
                  }
              }
          }
        });
    }

    return result;
}

function getQueryParameters() {
    const result = {
      gcHostOrigin: null,
      gcTargetEnv: null,
      pcEnvironment: null,
      conversationId: null
    };
    if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) {
      let oauthParams = extractParams(window.location.hash.substring(1));
      if (oauthParams && oauthParams.access_token && oauthParams.state) {
        // OAuth2 spec dictates this encoding
        // See: https://tools.ietf.org/html/rfc6749#appendix-B
        const queryParams = extractParams(unescape(oauthParams.state));
        result.gcHostOrigin = queryParams.gcHostOrigin;
        result.gcTargetEnv = queryParams.gcTargetEnv;
        result.pcEnvironment = queryParams.pcEnvironment;
        result.conversationId = queryParams.conversationId;
      }
    }
    const queryParams = extractParams(window.location.search.substring(1));
    if (!result.gcHostOrigin) {
      result.gcHostOrigin = queryParams.gcHostOrigin;
    }
    if (!result.gcTargetEnv) {
      result.gcTargetEnv = queryParams.gcTargetEnv;
    }
    if (!result.pcEnvironment) {
      result.pcEnvironment = queryParams.pcEnvironment;
    }
    if (!result.conversationId) {
      result.conversationId = queryParams.conversationId;
    }    
    return result;
}

function computeState({ gcHostOrigin, gcTargetEnv, pcEnvironment,conversationId }) {
    if (gcHostOrigin && gcTargetEnv) {
        return `gcHostOrigin=${gcHostOrigin}&gcTargetEnv=${gcTargetEnv}&conversationId=${conversationId}`;
    } else {
        return `pcEnvironment=${pcEnvironment}`;
    }
}
