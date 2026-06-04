import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function PvDetail() {
  return <ResourceDetailPage config={{
    title: 'PV',
    nameParam: 'pvName',
    detailApi: '/mrboard/pv/v1/Detail',
    yamlApi: '/mrboard/pv/v1/Yaml',
    backPath: '/k8s/pv',
    infoFields: [
      ['名称', 'pvName', '状态', 'status'],
      ['容量', 'capacity', '存储类', 'storageClass'],
      ['访问模式', 'accessModes', '回收策略', 'reclaimPolicy'],
      ['创建时间', 'createTime', '', ''],
    ],
  }} />
}
