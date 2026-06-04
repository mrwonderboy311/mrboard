import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function GatewayDetail() {
  return <ResourceDetailPage config={{
    title: 'Gateway',
    nameParam: 'gatewayName',
    detailApi: '/mrboard/gateway/v1/Detail',
    yamlApi: '/mrboard/gateway/v1/Yaml',
    deleteApi: '/mrboard/gateway/v1/Delete',
    modifyYamlApi: '/mrboard/gateway/v1/UpdateByYaml',
    backPath: '/k8s/gateway',
    infoFields: [
      ['名称', 'gatewayName', '命名空间', 'nameSpace'],
      ['GatewayClass', 'gatewayClass', '地址', 'addresses'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
