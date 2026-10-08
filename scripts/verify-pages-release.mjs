import { pathToFileURL } from 'node:url';
export function verifyDeployment(project, sha) {
  const deployment = project.canonical_deployment;
  const metadata = deployment?.deployment_trigger?.metadata;
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Expected a full source commit');
  if (deployment?.environment !== 'production' || deployment?.latest_stage?.status !== 'success') throw new Error('No successful production deployment');
  if (metadata?.branch !== 'main' || metadata?.commit_hash !== sha || metadata?.commit_dirty !== false) throw new Error('Production source revision does not match this release');
  return deployment.id;
}
async function main() {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_DEPLOY_TOKEN: token, PAGES_PROJECT: project, GITHUB_SHA: sha } = process.env;
  if (!account || !token || !project) throw new Error('Missing approved deployment configuration');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects/${encodeURIComponent(project)}`;
  for (let attempt=0; attempt<12; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Deployment verification API returned HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error('Deployment verification API rejected the request');
    try { console.log(`Verified deployment ${verifyDeployment(data.result, sha)} for source ${sha}`);return; }
    catch (error) {if(attempt===11)throw error;}
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {console.error(error.message);process.exitCode=1;});
