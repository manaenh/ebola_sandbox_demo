# scenarios.py

SCENARIOS = {
    "低干预": {
        "description": "口岸识别不足、医院问询不足、流调延迟、社区随访弱。",
        "interventions": {
            "port_screening": False,
            "fast_transfer": False,
            "hospital_history_check": False,
            "hospital_isolation": False,
            "cdc_tracing": False,
            "cdc_extra_staff": False,
            "community_followup": False,
            "community_isolation": False,
            "health_resource_allocation": False,
            "health_supplies": False,
        },
    },
    "标准干预": {
        "description": "医院发现后上报，疾控启动流调，社区开展部分随访。",
        "interventions": {
            "port_screening": False,
            "fast_transfer": False,
            "hospital_history_check": True,
            "hospital_isolation": True,
            "cdc_tracing": True,
            "cdc_extra_staff": False,
            "community_followup": True,
            "community_isolation": False,
            "health_resource_allocation": True,
            "health_supplies": False,
        },
    },
    "强化协同": {
        "description": "口岸、医院、疾控、社区、卫健委快速协同干预。",
        "interventions": {
            "port_screening": True,
            "fast_transfer": True,
            "hospital_history_check": True,
            "hospital_isolation": True,
            "cdc_tracing": True,
            "cdc_extra_staff": True,
            "community_followup": True,
            "community_isolation": True,
            "health_resource_allocation": True,
            "health_supplies": True,
        },
    },
}