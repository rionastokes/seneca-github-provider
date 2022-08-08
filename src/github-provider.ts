/* Copyright © 2021 Seneca Project Contributors, MIT License. */


// TODO: namespace provider zone; needs seneca-entity feature

import { Octokit } from '@octokit/rest'
import { make_actions } from './cmd-handlers'
import { ents } from './entities'
import { EntData, EntityMap } from './types'

type GithubProviderOptions = {}


/* Repo ids are of the form 'owner/name'. The internal github id field is
 * moved to github_id.
 *
 *
 */


function GithubProvider(this: any, _options: any) {
  const seneca: any = this

  let sdk: Record<string, any> = { octokit: undefined }

  // NOTE: sys- zone prefix is reserved.

  add_actions()
  seneca
    .message('sys:provider,provider:github,get:info', get_info)

  function add_actions() {
    const entities = prepare_ents(ents)

    for (const ent of entities) {
      seneca.message(ent.patterns.load, (make_load(ent) || unknown_cmd))
      seneca.message(ent.patterns.save, (make_save(ent) || unknown_cmd))
    }
  }

  function make_load(ent: EntData) {
    if(!ent.load) return false
    return make_actions(
      ent.load.sdk_params,
      ent.load.action_details,
      sdk
    ).load
  }

  function make_save(ent: EntData) {
    if(!ent.save) return false
    return make_actions(
      ent.save.sdk_params,
      ent.save.action_details,
      sdk
    ).save
  }

  async function unknown_cmd(this: any, msg: any) {
    throw new Error(`undefined action: ${msg.cmd}, entity: ${msg.ent.entity$}`)
  }

  function prepare_ents(entities: EntityMap): Array<EntData> {
    const ents_data: EntData[] = []

    for (const [ent_name, data] of Object.entries(entities)) {
      const { actions } = data
      data.name = ent_name
      const ent_data:any = {}
      
      const common = { name: ent_name, zone: 'provider', base: 'github', role: 'entity'}
      ent_data.patterns = {
        load: {cmd: 'load', ...common},
        save: {cmd: 'save', ...common}
      }

      for (const [action_name, action_details] of Object.entries(actions)) {
        ent_data[action_name] = {
          sdk_params: data.sdk,
          action_details,
        }
      }

      ents_data.push(ent_data)
    }

    return ents_data
  }

  async function get_info(this: any, _msg: any) {
    return {
      ok: true,
      name: 'github',
      details: {
        sdk: '@octokit/rest'
      }
    }
  }

  seneca.prepare(async function(this: any) {
    let out = await this.post('sys:provider,get:key,provider:github,key:api')
    if (!out.ok) {
      this.fail('api-key-missing')
    }

    let config = {
      auth: out.value
    }

    sdk.octokit = new Octokit(config)
  })


  return {
    exports: {
      native: () => ({
        octokit: sdk.octokit
      })
    }
  }
}


// Default options.
const defaults: GithubProviderOptions = {

  // TODO: Enable debug logging
  debug: false
}


Object.assign(GithubProvider, { defaults })

export default GithubProvider

if ('undefined' !== typeof (module)) {
  module.exports = GithubProvider
}
