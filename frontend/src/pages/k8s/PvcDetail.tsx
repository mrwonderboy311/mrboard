import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function PvcDetail() {
  return <ResourceDetailPage config={{
    title: 'PVC',
    nameParam: 'pvcName',
    detailApi: '/mrboard/pvc/v1/Detail',
    yamlApi: '/mrboard/pvc/v1/Yaml',
    modifyYamlApi: '/mrboard/apply/v1/ApplyYaml',
    backPath: '/k8s/pvc',
    infoFields: [
      ['名称', 'pvcName', '命名空间', 'nameSpace'],
      ['状态', 'status', '存储类', 'storageClass'],
      ['容量', 'capacity', '访问模式', 'accessModes'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
