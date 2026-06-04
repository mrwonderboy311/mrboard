import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function HttpRouteDetail() {
  return <ResourceDetailPage config={{
    title: 'HTTPRoute',
    nameParam: 'routeName',
    detailApi: '/mrboard/httproute/v1/Detail',
    yamlApi: '/mrboard/httproute/v1/Yaml',
    deleteApi: '/mrboard/httproute/v1/Delete',
    modifyYamlApi: '/mrboard/httproute/v1/UpdateByYaml',
    backPath: '/k8s/httproute',
    infoFields: [
      ['名称', 'routeName', '命名空间', 'nameSpace'],
      ['父网关', 'parentRefs', '主机名', 'hostnames'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
