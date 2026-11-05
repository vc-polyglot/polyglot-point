import fs from 'node:fs';
import {validatePeopleAssets,planPeoplePublication} from './people-publication.js';
import {recoverHostedCollections} from './deploy-migration.js';

export const approvedPriestPortraits=JSON.parse(fs.readFileSync(new URL('./data/approved-priest-portraits.json',import.meta.url),'utf8')).people;
export const planPriestPortraits=(existing,references,stamp)=>planPeoplePublication(existing,references,stamp,approvedPriestPortraits);

export function publishHostedPriestPortraits(client){
 validatePeopleAssets(approvedPriestPortraits);
 return recoverHostedCollections(client,[],{migrationId:'rector-vicar-portraits-20261104-v1',planner:planPriestPortraits,format:'san-ignacio-rector-vicar-portraits-v1'});
}
