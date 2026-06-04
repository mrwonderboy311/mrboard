import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function SecretDetail() {
  return <ResourceDetailPage config={{
    title: 'Secret',
    nameParam: 'secretName',
    detailApi: '/mrboard/secret/v1/Detail',
    yamlApi: '/mrboard/secret/v1/Yaml',
    deleteApi: '/mrboard/secret/v1/Del',
    modifyYamlApi: '/mrboard/secret/v1/ModifyByYaml',
    backPath: '/k8s/secret',
    infoFields: [
      ['名称', 'secretName', '命名空间', 'nameSpace'],
      ['类型', 'secretType', '数据键', 'dataKeys'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
