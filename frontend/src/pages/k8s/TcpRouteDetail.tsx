import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function TcpRouteDetail() {
  return <ResourceDetailPage config={{
    title: 'TCPRoute',
    nameParam: 'routeName',
    detailApi: '/mrboard/tcproute/v1/Detail',
    yamlApi: '/mrboard/tcproute/v1/Yaml',
    deleteApi: '/mrboard/tcproute/v1/Delete',
    modifyYamlApi: '/mrboard/tcproute/v1/UpdateByYaml',
    backPath: '/k8s/tcproute',
    infoFields: [
      ['名称', 'routeName', '命名空间', 'nameSpace'],
      ['父网关', 'parentRefs', '创建时间', 'createTime'],
    ],
  }} />
}
