import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function GatewayClassDetail() {
  return <ResourceDetailPage config={{
    title: 'GatewayClass',
    nameParam: 'gcName',
    detailApi: '/mrboard/gatewayclass/v1/Detail',
    yamlApi: '/mrboard/gatewayclass/v1/Yaml',
    backPath: '/k8s/gatewayclass',
    infoFields: [
      ['名称', 'gcName', '控制器', 'controller'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
