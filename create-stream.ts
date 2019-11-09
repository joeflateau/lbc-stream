const source = process.argv[2];

import * as rp from "request-promise";
import { spawn } from "child_process";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const permanentToken = process.env.access_token;
const user = process.env.user;
const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;

function shortToLong(shortToken) {
  return rp({
    method: "GET",
    uri: "https://graph.facebook.com/oauth/access_token",
    qs: {
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortToken
    },
    json: true
  }).then(resp => {
    console.log(resp);
    return resp.access_token;
  });
}

function getUserId(accessToken) {
  return rp({
    method: "GET",
    uri: "https://graph.facebook.com/v5.0/me",
    qs: {
      access_token: accessToken
    },
    json: true
  }).then(resp => resp.id);
}

function getPermanentToken(id, accessToken) {
  return rp({
    method: "GET",
    uri: `https://graph.facebook.com/v5.0/${id}`,
    qs: {
      fields: "access_token",
      access_token: accessToken
    },
    json: true
  }).then(resp => {
    console.log(resp);
    return resp.access_token;
  });
}

function createLiveStream(id, accessToken) {
  return rp({
    uri: `https://graph.facebook.com/v5.0/${user}/live_videos?access_token=${accessToken}`,
    method: "POST",
    json: true
  }).then(r => {
    const streamUrl = r.secure_stream_url;
    console.log(streamUrl);
    return streamUrl;
  });
}

function shortToPermanent(shortAccessToken) {
  return shortToLong(shortAccessToken).then(longAccessToken =>
    getUserId(longAccessToken).then(id =>
      getPermanentToken(id, longAccessToken)
    )
  );
}

createLiveStream(user, permanentToken)
  .then(streamUrl => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-re",
        "-i",
        source,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-strict",
        "-2",
        "-f",
        "flv",
        streamUrl
      ],
      {
        stdio: "inherit"
      }
    );

    process.on("SIGTERM", () => {
      ffmpeg.kill("SIGTERM");
    });
  })
  .catch(err => {
    console.error(JSON.stringify({ message: err.message, stack: err.stack }));
  });
