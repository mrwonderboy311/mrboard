import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function GrpcRouteDetail() {
  return <ResourceDetailPage config={{
    title: 'GRPCRoute',
    nameParam: 'routeName',
    detailApi: '/mrboard/grpcroute/v1/Detail',
    yamlApi: '/mrboard/grpcroute/v1/Yaml',
    deleteApi: '/mrboard/grpcroute/v1/Delete',
    modifyYamlApi: '/mrboard/grpcroute/v1/UpdateByYaml',
    backPath: '/k8s/grpcroute',
    infoFields: [
      ['名称', 'routeName', '命名空间', 'nameSpace'],
      ['父网关', 'parentRefs', '主机名', 'hostnames'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
