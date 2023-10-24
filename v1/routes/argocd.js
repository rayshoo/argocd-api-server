const express = require('express');
const router = express.Router();
const fetch = require('request-promise-native');
const timeout = parseInt(require('dotenv').config().parsed.TIMEOUT || process.env.TIMEOUT) || 5000
const protocol = require('dotenv').config().parsed.ARGOCD_PROTOCOL || process.env.ARGOCD_PROTOCOL || 'http';
const argocdHost = require('dotenv').config().parsed.ARGOCD_HOST || process.env.ARGOCD_HOST
const argocdPort = parseInt(require('dotenv').config().parsed.ARGOCD_PORT || process.env.ARGOCD_PORT) || 80;
const logging = require('../modules/logging');

let getAppsPath = async repo=>{
  let keep = true;
  for (let i in repo['argocd-apps']) {
    await fetch({
      uri: `${protocol}://${argocdHost}:${argocdPort}/api/v1/applications/${repo['argocd-apps'][i]['name']}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${global.token}`
      },
      json: true,
      timeout
    })
    .then(resp=>{
      repo['argocd-apps'][i]['path'] = resp.spec.source.path;
      repo['argocd-apps'][i]['targetRevision'] = resp.spec.source.targetRevision;
      repo['argocd-apps'][i]['syncRevision'] = resp.status.sync.revision;
      repo['argocd-apps'][i]['status'] = resp.status.sync.status;
      repo['argocd-apps'][i]['health'] = resp.status.health.status;
    })
    .catch(err=>{
      console.error(logging(err.error));;
      if (err.error != undefined && err.error.code != undefined && typeof err.error.code === "string" && err.error.code == 'ETIMEDOUT') {
        repo = JSON.parse(`{"error": "Connecting to ${protocol}://${argocdHost}:${argocdPort} failed."}`)
      } else {
        repo = JSON.parse(`{"error": "Failed to find '${repo['argocd-apps'][i]['name']}' app path."}`)
      }
      keep = false;
    })
    if (!keep) break;
  }
  return repo;
}

router.get('/', (_,res)=>{res.send('Made by raychoo')});

router.get(['/app','/app/:name'], (req,res)=>{
  if (!req.params.name) {
    res.json({'error': 'app name sub path is required'});
    return;
  }
  fetch({
    uri: `${protocol}://${argocdHost}:${argocdPort}/api/v1/applications/${req.params.name}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${global.token}`
    },
    json: true,
    timeout
  })
  .then(resp=>{
    let sources = [];
    if (resp.spec.source) {
      sources.push({
        'path': resp.spec.source.path,
        'targetRevision': resp.spec.source.targetRevision
      })
    }
    if (resp.spec.sources) {
      for (let i in resp.spec.sources) {
        sources.push({
          'path': resp.spec.sources[i].path,
          'targetRevision': resp.spec.sources[i].targetRevision
        })
      }
    }
    res.json({
      sources,
      'syncRevision': resp.status.sync.revision,
      'status': resp.status.sync.status,
      'health': resp.status.health.status
    });
  })
  .catch(err=>{
    console.error(logging(err));;
    if (err.error != undefined && err.error.code != undefined && typeof err.error.code === "string" && err.error.code == 'ETIMEDOUT') {
      res.status(500).json({'error':`Connecting to ${protocol}://${argocdHost}:${argocdPort} failed.`});
    } else {
      res.status(500).json({'error':`${req.params.name} applications not found.`});
    }
  })
});

router.post('/app/:name/sync', (req,res)=>{
  fetch({
    uri: `${protocol}://${argocdHost}:${argocdPort}/api/v1/applications/${req.params.name}/sync`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${global.token}`
    },
    body: req.body,
    json: true,
    timeout
  })
  .then(resp=>{
    res.json({
      'status': resp.status.sync,
      'operation': resp.operation.sync
    });
  })
  .catch(err=>{
    console.error(logging(err.error));;
    if (err.error != undefined && err.error.code != undefined && typeof err.error.code === "string" && err.error.code == 'ETIMEDOUT') {
      res.status(500).json({'error':`Connecting to ${protocol}://${argocdHost}:${argocdPort} failed`});
    } else {
      res.status(500).json({'error':`${req.params.name} app sync failed.`});
    }
  })
});

router.get('/apps', async(req,res)=>{
  data = await getAppsPath(req.body);
  data.error == undefined ? res.json(data) : res.status(500).json(data);
});

router.post('/apps/sync', async(req,res)=>{

});

module.exports = router;