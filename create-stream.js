"use strict";
exports.__esModule = true;
var source = process.argv[2];
var rp = require("request-promise");
var child_process_1 = require("child_process");
var dotenv_1 = require("dotenv");
dotenv_1.config();
var permanentToken = process.env.access_token;
var user = process.env.user;
var clientId = process.env.client_id;
var clientSecret = process.env.client_secret;
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
    }).then(function (resp) {
        console.log(resp);
        return resp.access_token;
    });
}
function getUserId(accessToken) {
    return rp({
        method: "GET",
        uri: "https://graph.facebook.com/v2.10/me",
        qs: {
            access_token: accessToken
        },
        json: true
    }).then(function (resp) { return resp.id; });
}
function getPermanentToken(id, accessToken) {
    return rp({
        method: "GET",
        uri: "https://graph.facebook.com/v2.10/" + id,
        qs: {
            fields: "access_token",
            access_token: accessToken
        },
        json: true
    }).then(function (resp) {
        console.log(resp);
        return resp.access_token;
    });
}
function createLiveStream(id, accessToken) {
    return rp({
        uri: "https://graph.facebook.com/v2.10/" + user + "/live_videos?access_token=" + accessToken,
        method: "POST",
        json: true
    }).then(function (r) {
        var streamUrl = r.stream_url;
        console.log(streamUrl);
        return streamUrl;
    });
}
function shortToPermanent(shortAccessToken) {
    return shortToLong(shortAccessToken).then(function (longAccessToken) {
        return getUserId(longAccessToken).then(function (id) {
            return getPermanentToken(id, longAccessToken);
        });
    });
}
createLiveStream(user, permanentToken).then(function (streamUrl) {
    var ffmpeg = child_process_1.spawn("ffmpeg", [
        "-re",
        "-i",
        source,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-f",
        "flv",
        streamUrl
    ], {
        stdio: "inherit"
    });
    process.on("SIGTERM", function () {
        ffmpeg.kill("SIGTERM");
    });
});
