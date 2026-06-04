import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function ConfigMapDetail() {
  return <ResourceDetailPage config={{
    title: 'ConfigMap',
    nameParam: 'cmName',
    detailApi: '/mrboard/cm/v1/Detail',
    yamlApi: '/mrboard/cm/v1/Yaml',
    deleteApi: '/mrboard/cm/v1/Del',
    modifyYamlApi: '/mrboard/cm/v1/ModifyByYaml',
    backPath: '/k8s/configmap',
    infoFields: [
      ['名称', 'cmName', '命名空间', 'nameSpace'],
      ['数据键', 'dataKeys', '创建时间', 'createTime'],
    ],
  }} />
}
