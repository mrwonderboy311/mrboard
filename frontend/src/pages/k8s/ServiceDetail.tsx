import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function ServiceDetail() {
  return <ResourceDetailPage config={{
    title: 'Service',
    nameParam: 'serviceName',
    detailApi: '/mrboard/svc/v1/Detail',
    yamlApi: '/mrboard/svc/v1/Yaml',
    deleteApi: '/mrboard/svc/v1/Del',
    modifyYamlApi: '/mrboard/svc/v1/ModifyByYaml',
    backPath: '/k8s/service',
    infoFields: [
      ['名称', 'svcName', '命名空间', 'nameSpace'],
      ['类型', 'type', 'ClusterIP', 'clusterIp'],
      ['端口', 'ports', '选择器', 'selector'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
