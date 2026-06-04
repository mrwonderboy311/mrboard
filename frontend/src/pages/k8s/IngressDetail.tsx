import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function IngressDetail() {
  return <ResourceDetailPage config={{
    title: 'Ingress',
    nameParam: 'ingressName',
    detailApi: '/mrboard/ing/v1/Detail',
    yamlApi: '/mrboard/ing/v1/Yaml',
    deleteApi: '/mrboard/ing/v1/Del',
    backPath: '/k8s/ingress',
    infoFields: [
      ['名称', 'ingressName', '命名空间', 'nameSpace'],
      ['地址', 'address', 'IngressClass', 'ingressClass'],
      ['规则', 'rules', 'TLS', 'tls'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
