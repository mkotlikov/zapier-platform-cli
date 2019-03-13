const colors = require('colors/safe');

const constants = require('../constants');
const utils = require('../utils');

const QUESTION_USERNAME =
  'What is your Zapier login email address? (Ctrl-C to cancel)';
const QUESTION_PASSWORD = 'What is your Zapier login password?';
const QUESTION_TOTP = 'What is your current 6-digit 2FA code?';

const login = async (context, firstTime = true) => {
  const checks = [
    utils
      .readCredentials()
      .then(() => true)
      .catch(() => false),
    utils
      .checkCredentials()
      .then(() => true)
      .catch(() => false)
  ];
  const [credentialsPresent, credentialsGood] = await Promise.all(checks);

  if (!credentialsPresent) {
    context.line(
      colors.yellow(
        `Your ${constants.AUTH_LOCATION} has not been set up yet.\n`
      )
    );
  } else if (!credentialsGood) {
    context.line(
      colors.red(
        `Your ${
          constants.AUTH_LOCATION
        } looks like it has invalid credentials.\n`
      )
    );
  } else {
    context.line(
      colors.green(
        `Your ${
          constants.AUTH_LOCATION
        } looks valid. You may update it now though.\n`
      )
    );
  }
  const username =
    context.argOpts['username'] || (await utils.getInput(QUESTION_USERNAME));
  const password =
    context.argOpts['password'] ||
    (await utils.getInput(QUESTION_PASSWORD, { secret: true }));

  let goodResponse;
  try {
    goodResponse = await utils.createCredentials(username, password);
  } catch ({ errText, json: { errors } }) {
    if (errors[0].startsWith('missing totp_code')) {
      const code = await utils.getInput(QUESTION_TOTP);
      goodResponse = await utils.createCredentials(username, password, code);
    } else {
      throw new Error(errText);
    }
  }

  const deployKey = goodResponse.key;

  await utils.writeFile(
    constants.AUTH_LOCATION,
    utils.prettyJSONstringify({
      [constants.AUTH_KEY]: deployKey
    })
  );

  await utils.checkCredentials();

  context.line(
    `Your deploy key has been saved to ${constants.AUTH_LOCATION}. `
  );

  if (firstTime) {
    context.line('Now try `zapier init .` to start a new local app.\n');
  }
};
login.argsSpec = [];
login.argOptsSpec = {
  username: {
    flag: false,
    help: 'username'
  },
  password: {
    flag: false,
    help: 'password'
  }
};
login.help = `Configure your \`${
  constants.AUTH_LOCATION_RAW
}\` with a deploy key.`;
login.example = 'zapier login';
login.docs = `

**Arguments**

${utils.argOptsFragment(login.argOptsSpec)}

This is an interactive prompt which will create, retrieve and store a deploy key.

> This will change the  \`${
  constants.AUTH_LOCATION_RAW
}\` (home directory identifies the deploy key & user).

${'```'}bash
$ zapier login
# ${QUESTION_USERNAME}
# ${QUESTION_PASSWORD}
#  <type here>
# Your deploy key has been saved to ${
  constants.AUTH_LOCATION_RAW
}. Now try \`zapier init .\` to start a new local app.
${'```'}
`;

module.exports = login;
