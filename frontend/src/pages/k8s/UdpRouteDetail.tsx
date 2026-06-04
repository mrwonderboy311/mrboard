import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function UdpRouteDetail() {
  return <ResourceDetailPage config={{
    title: 'UDPRoute',
    nameParam: 'routeName',
    detailApi: '/mrboard/udproute/v1/Detail',
    yamlApi: '/mrboard/udproute/v1/Yaml',
    deleteApi: '/mrboard/udproute/v1/Delete',
    modifyYamlApi: '/mrboard/udproute/v1/UpdateByYaml',
    backPath: '/k8s/udproute',
    infoFields: [
      ['名称', 'routeName', '命名空间', 'nameSpace'],
      ['父网关', 'parentRefs', '创建时间', 'createTime'],
    ],
  }} />
}
